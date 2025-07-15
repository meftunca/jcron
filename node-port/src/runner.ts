// src/runner.ts
import { v4 as uuidv4 } from "uuid";
import { Engine } from "./engine";
import { fromCronSyntax, Schedule } from "./schedule";
import type { IJob, ILogger, JobFunc, JobOption, ManagedJob } from "./types";

// Basit bir yardımcı fonksiyon
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// JobFunc'ı IJob arayüzüne dönüştüren fabrika fonksiyonu
function toJob(fn: JobFunc): IJob {
  return {
    async run() {
      await fn();
    },
  };
}

export class Runner {
  private readonly engine = new Engine();
  private readonly jobs = new Map<string, ManagedJob>();
  private readonly logger: ILogger;
  private readonly rebootJobs: IJob[] = []; // YENİ: @reboot görevleri için
  private isRunning = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(logger: ILogger = console) {
    this.logger = logger;
  }

  public addFuncCron(
    cronString: string,
    cmd: JobFunc,
    ...opts: JobOption[]
  ): string {
    // @reboot'u özel olarak ele al
    if (cronString.trim() === "@reboot") {
      const job = toJob(cmd);
      this.rebootJobs.push(job);
      const id = `reboot-${uuidv4()}`;
      this.logger.info(
        { job_id: id, schedule: "@reboot" },
        "New @reboot job added"
      );
      return id;
    }
    const schedule = fromCronSyntax(cronString);
    return this.addJob(schedule, toJob(cmd), ...opts);
  }

  public addJob(schedule: Schedule, job: IJob, ...opts: JobOption[]): string {
    const now = new Date();
    const nextRun = this.engine.next(schedule, now);
    const id = uuidv4();
    const managedJob: ManagedJob = {
      id,
      schedule,
      job,
      nextRun,
      retryOptions: { maxRetries: 0, delay: 0 },
    };
    opts.forEach((opt) => opt(managedJob));
    this.jobs.set(id, managedJob);
    this.logger.info(
      { job_id: id, next_run: nextRun.toISOString() },
      "New job added"
    );
    if (this.isRunning) this._reschedule();
    return id;
  }

  public start(): void {
    if (this.isRunning) {
      this.logger.warn({}, "Runner is already running.");
      return;
    }

    // Adım 1: @reboot görevlerini çalıştır
    this.logger.info(
      { count: this.rebootJobs.length },
      "Running @reboot jobs..."
    );
    for (const job of this.rebootJobs) {
      // Bu görevleri de hata korumasıyla ayrı ayrı çalıştır
      this._runRebootJob(job);
    }

    // Adım 2: Zamanlanmış görevler için döngüyü başlat
    this.isRunning = true;
    this.logger.info({}, "Runner started for scheduled jobs.");
    this._scheduleNextTick();
  }

  // ... `stop`, `removeJob` ve diğer metodlar aynı kalır ...
  // ... `_tick`, `_scheduleNextTick`, `_reschedule` aynı kalır ...

  // @reboot görevlerini çalıştırmak için _runJob'un basitleştirilmiş bir versiyonu
  private async _runRebootJob(job: IJob): Promise<void> {
    try {
      await job.run();
      this.logger.info({}, "A @reboot job completed successfully.");
    } catch (err) {
      this.logger.error(
        { error: (err as Error).message },
        "A @reboot job failed to run."
      );
    }
  }

  public removeJob(id: string): void {
    if (this.jobs.delete(id)) {
      this.logger.info({ job_id: id }, "Job removed");
      if (this.isRunning) this._reschedule();
    }
  }

  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.logger.info({}, "Runner stopped gracefully.");
  }

  // Neden `setTimeout` ile dinamik bekleme?
  // Her saniye `setInterval` ile uyanmak yerine, bir sonraki görevin
  // tam olarak ne zaman çalışacağını hesaplayıp o zamana kadar uykuya
  // geçiyoruz. Bu, CPU kullanımını neredeyse sıfıra indirir ve
  // binlerce görev olsa bile sistemi yormaz.
  private _scheduleNextTick(): void {
    if (!this.isRunning || this.jobs.size === 0) return;

    const now = Date.now();
    const nextRunTime = Math.min(
      ...Array.from(this.jobs.values(), (j) => j.nextRun.getTime())
    );
    const delay = Math.max(0, nextRunTime - now);

    this.timeoutId = setTimeout(() => this._tick(), delay);
  }

  private _tick(): void {
    const now = new Date();
    const jobsToRun: ManagedJob[] = [];

    this.jobs.forEach((job) => {
      if (job.nextRun <= now) {
        jobsToRun.push(job);
      }
    });

    for (const job of jobsToRun) {
      // *** VERİMLİ EŞZAMANLILIK YÖNETİMİ ***
      // Her görevi kendi asenkron "scope"unda çalıştırıyoruz.
      // `_runJob`'un kendisi `async` olduğu için anında bir Promise döner.
      // Ana `_tick` döngüsü, bir görevin bitmesini beklemeden
      // anında bir sonraki adıma geçer ve yeni tick'i planlar.
      // Bu, uzun süren bir görevin (örn. 5dk süren bir raporlama)
      // diğer kısa görevleri (örn. her saniye çalışan bir sayaç)
      // bloklamasını tamamen engeller.
      this._runJob(job).catch((err) => {
        // Bu hata normalde _runJob içinde yakalanır, bu bir son çare.
        this.logger.error(
          { job_id: job.id, error: (err as Error).message },
          "Unhandled error in job execution wrapper"
        );
      });

      // Bir sonraki çalışma zamanını hemen güncelle.
      const currentJob = this.jobs.get(job.id);
      if (currentJob) {
        currentJob.nextRun = this.engine.next(currentJob.schedule, now);
      }
    }

    if (this.isRunning) {
      this._scheduleNextTick();
    }
  }

  private async _runJob(job: ManagedJob): Promise<void> {
    // "Panic" koruması: Görevin içindeki beklenmedik bir hata (throw)
    // tüm runner'ı ve Node.js process'ini çökertmesin.
    try {
      this.logger.info({ job_id: job.id }, "Job triggered");
      for (let attempt = 0; attempt <= job.retryOptions.maxRetries; attempt++) {
        try {
          await job.job.run();
          this.logger.info(
            { job_id: job.id, attempt: attempt + 1 },
            "Job completed successfully"
          );
          return;
        } catch (err) {
          const error = err as Error;
          if (attempt < job.retryOptions.maxRetries) {
            this.logger.warn(
              {
                job_id: job.id,
                attempt: `${attempt + 1}/${job.retryOptions.maxRetries + 1}`,
                delay: `${job.retryOptions.delay}ms`,
                error: error.message,
              },
              "Job failed, will retry"
            );
            await sleep(job.retryOptions.delay);
          } else {
            this.logger.error(
              {
                job_id: job.id,
                error: error.message,
              },
              "Job failed after all retries"
            );
          }
        }
      }
    } catch (panic) {
      const error = panic as Error;
      this.logger.error(
        { job_id: job.id, panic: error.stack || error.message },
        "Job panicked!"
      );
    }
  }

  private _reschedule(): void {
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this._scheduleNextTick();
  }
  public getJobs(): ManagedJob[] {
    return Array.from(this.jobs.values());
  }
  public getRebootJobs(): IJob[] {
    return this.rebootJobs;
  }
  public isWorking(): boolean {
    return this.isRunning;
  }
}
