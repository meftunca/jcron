import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { withRetries } from "../src/options.js";
import { Runner } from "../src/runner.js";
import type { JobFunc } from "../src/types.js";
import { tickAsync, useFakeTimers, useRealTimers } from "./utils.js";
// Testler için sahte (mock) logger.
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
describe("Runner", () => {
  // Sahte zamanlayıcıları tüm test süreci için bir kez kuruyoruz.
  beforeAll(() => {
    useFakeTimers();
  });

  // Tüm testler bittiğinde orijinal zamanlayıcılara dönüyoruz.
  afterAll(() => {
    useRealTimers();
  });

  let runner: Runner;
  // spy'ları tutmak için değişkenler - bun test framework'e uygun tip
  let infoSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    // Her testten önce spy'ları kuruyoruz.
    // Bu, `mockLogger.info` çağrıldığında `infoSpy`'ın bunu bilmesini sağlar.
    infoSpy = spyOn(mockLogger, "info");
    warnSpy = spyOn(mockLogger, "warn");
    errorSpy = spyOn(mockLogger, "error");

    // Runner'ı, metodları gözetlenen logger ile başlatıyoruz.
    runner = new Runner(mockLogger);
  });

  afterEach(() => {
    runner.stop();
    // Bir sonraki teste temiz bir başlangıç yapmak için tüm spy'ları restore et.
    mock.restore();
  });

  it("should run a successful job at the correct time", async () => {
    const jobFn = mock(() => Promise.resolve());
    runner.addFuncCron("* * * * * *", jobFn as JobFunc);
    runner.start();

    await tickAsync(1001);

    expect(jobFn).toHaveBeenCalledTimes(1);
    // Spy çağrılarını kontrol et
    expect(infoSpy).toHaveBeenCalledWith(expect.any(Object), "New job added");
    expect(infoSpy).toHaveBeenCalledWith(
      { job_id: expect.any(String) },
      "Job triggered"
    );
    expect(infoSpy).toHaveBeenCalledWith(
      { job_id: expect.any(String), attempt: 1 },
      "Job completed successfully"
    );
  });

  it("should handle retry logic for a failing job and eventually succeed", async () => {
    let attemptCount = 0;
    const jobFn = async () => {
      attemptCount++;
      if (attemptCount < 3) throw new Error("Temporary error");
    };

    runner.addFuncCron("* * * * * *", jobFn, withRetries(3, 50));
    runner.start();

    await tickAsync(1001);
    await tickAsync(51);
    await tickAsync(51);

    expect(attemptCount).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy).toHaveBeenCalledWith(
      { job_id: expect.any(String), attempt: 3 },
      "Job completed successfully"
    );
  });

  it("should recover from a panicking job and continue running", async () => {
    const panickingJob = mock(() => {
      throw new Error("I panicked!");
    });
    const goodJob = mock(() => Promise.resolve());

    runner.addFuncCron("* * * * * *", panickingJob as JobFunc);
    runner.addFuncCron("* * * * * *", goodJob as JobFunc);
    runner.start();

    await tickAsync(1001);

    expect(panickingJob).toHaveBeenCalledTimes(1);
    expect(goodJob).toHaveBeenCalledTimes(1);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: expect.any(String),
        error: "I panicked!",
      }),
      "Job failed after all retries"
    );
  });
});
