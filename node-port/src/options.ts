// src/options.ts
import type { JobOption, ManagedJob } from "./types";

/**
 * Bir göreve yeniden deneme yeteneği kazandırır.
 * @param maxRetries Maksimum yeniden deneme sayısı.
 * @param delayMs Her deneme arasındaki milisaniye cinsinden bekleme süresi.
 */
export function withRetries(maxRetries: number, delayMs: number): JobOption {
  return (job: ManagedJob): void => {
    job.retryOptions = {
      maxRetries: Math.max(0, maxRetries),
      delay: Math.max(0, delayMs),
    };
  };
}
