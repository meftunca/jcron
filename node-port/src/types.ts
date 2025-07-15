// src/types.ts

/** Çalıştırılabilir bir görevin uyması gereken temel arayüz. */
export interface IJob {
  run(): void | Promise<void>;
}

/** `addFuncCron` ile kullanılacak basit fonksiyon tipi. */
export type JobFunc = () => void | Promise<void>;

/** Bir görevin yeniden deneme davranışını belirler. */
export interface RetryOptions {
  maxRetries: number;
  delay: number; // ms
}

/** Runner tarafından dahili olarak yönetilen bir görevin yapısı. */
export interface ManagedJob {
  readonly id: string;
  readonly schedule: import("./schedule").Schedule;
  readonly job: IJob;
  nextRun: Date;
  retryOptions: RetryOptions;
}

/** Bir göreve ek ayarlar uygulamak için kullanılan fonksiyon tipi. */
export type JobOption = (job: ManagedJob) => void;

/** Yapısal loglama için Runner'ın beklediği logger arayüzü. */
export interface ILogger {
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}
