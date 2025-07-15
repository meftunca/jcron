// tests/test_utils.ts

import FakeTimers, { type InstalledClock } from "@sinonjs/fake-timers";

// Aktif olan sahte zamanlayıcıyı tutacak olan değişken
let clock: InstalledClock | null = null;

/**
 * Global zamanlayıcıları (setTimeout, setInterval, Date) sahte versiyonlarıyla değiştirir.
 * Testlerinizin başında çağırmalısınız.
 */
export function useFakeTimers(): void {
  if (clock) {
    // Zaten kuruluysa bir şey yapma
    return;
  }
  // Sahte zamanlayıcıyı kur ve `clock` değişkenine ata
  clock = FakeTimers.install();
}

/**
 * Sahte zamanlayıcıları kaldırır ve orijinal global fonksiyonları geri yükler.
 * Testlerinizin sonunda (örn. afterEach içinde) çağırmalısınız.
 */
export function useRealTimers(): void {
  if (clock) {
    clock.uninstall();
    clock = null;
  }
}

/**
 * Sahte zamanı belirtilen milisaniye kadar ileri sarar ve bu süreçte
 * tetiklenen tüm asenkron işlemleri (promise'lar) ve zamanlayıcıları çalıştırır.
 * @param ms - Zamanın ne kadar ileri sarılacağı (milisaniye cinsinden).
 */
export async function advanceTimersByTimeAsync(ms: number): Promise<void> {
  if (!clock) {
    throw new Error(
      "Fake timers are not installed. Call useFakeTimers() first."
    );
  }
  await clock.tickAsync(ms);
}

/**
 * `advanceTimersByTimeAsync` için bir takma ad (alias).
 */
export const tickAsync = advanceTimersByTimeAsync;
