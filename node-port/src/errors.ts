// src/errors.ts

/**
 * Cron ifadelerinin veya zamanlama yapılarının ayrıştırılması (parsing) sırasında
 * oluşan hatalar için kullanılır.
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Runner'ın çalışması sırasında meydana gelen genel hatalar için kullanılır.
 */
export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}
