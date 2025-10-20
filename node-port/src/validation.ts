// src/validation.ts
// High-performance validation functions

import { Schedule, fromCronSyntax, fromJCronString } from "./schedule";

// Error pattern cache for faster invalid expression detection
class ValidationCache {
  private static validExpressions = new Map<string, boolean>();
  private static invalidExpressions = new Set<string>();
  private static maxCacheSize = 1000;

  static isKnownValid(expression: string): boolean {
    return this.validExpressions.has(expression);
  }

  static isKnownInvalid(expression: string): boolean {
    return this.invalidExpressions.has(expression);
  }

  static markValid(expression: string): void {
    if (this.validExpressions.size < this.maxCacheSize) {
      this.validExpressions.set(expression, true);
    }
  }

  static markInvalid(expression: string): void {
    if (this.invalidExpressions.size < this.maxCacheSize) {
      this.invalidExpressions.add(expression);
    }
  }

  static clear(): void {
    this.validExpressions.clear();
    this.invalidExpressions.clear();
  }
}

// Fast validation patterns
class ValidationPatterns {
  // Pre-compiled regex for quick validation
  static readonly basicCronPattern =
    /^(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/\?L#]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/\?L#W]+)(?:\s+(\*|[\d\-,\/]+))?$/;

  static readonly jcronPattern =
    /^(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/\?L#]+)\s+(\*|[\d\-,\/]+)\s+(\*|[\d\-,\/\?L#W]+)(?:\s+(\*|[\d\-,\/]+))?(?:\s+(?:TZ:|WOY:|EOD:).+)*$/;

  // Fast field validation patterns
  static readonly validSecond =
    /^(\*|[0-5]?\d(?:-[0-5]?\d)?(?:,[0-5]?\d(?:-[0-5]?\d)?)*(?:\/\d+)?)$/;
  static readonly validMinute =
    /^(\*|[0-5]?\d(?:-[0-5]?\d)?(?:,[0-5]?\d(?:-[0-5]?\d)?)*(?:\/\d+)?)$/;
  static readonly validHour =
    /^(\*|(?:[01]?\d|2[0-3])(?:-(?:[01]?\d|2[0-3]))?(?:,(?:[01]?\d|2[0-3])(?:-(?:[01]?\d|2[0-3]))?)*(?:\/\d+)?)$/;
  static readonly validDay =
    /^(\*|\?|L|(?:[1-9]|[12]\d|3[01])(?:-(?:[1-9]|[12]\d|3[01]))?(?:,(?:[1-9]|[12]\d|3[01])(?:-(?:[1-9]|[12]\d|3[01]))?)*(?:\/\d+)?|[0-7]#[1-5]|[0-7]L)$/;
  static readonly validMonth =
    /^(\*|(?:[1-9]|1[0-2])(?:-(?:[1-9]|1[0-2]))?(?:,(?:[1-9]|1[0-2])(?:-(?:[1-9]|1[0-2]))?)*(?:\/\d+)?)$/;
  // Allow multiple #N, WN, and L patterns: "1#1,3L,5L" or "1#2,2#4" or "1W3,2W4"
  // Supports: 1#3 (3rd Monday), 1W3 (Monday of week 3), 1L (last Monday)
  static readonly validDow =
    /^(\*|\?|(?:[0-7](?:#[1-5]|W[1-5]|L)?|[0-7](?:-[0-7])?(?:\/\d+)?)(?:,(?:[0-7](?:#[1-5]|W[1-5]|L)?|[0-7](?:-[0-7])?(?:\/\d+)?))*)$/;
  static readonly validYear =
    /^(\*|19\d\d|20\d\d|21\d\d(?:-(?:19\d\d|20\d\d|21\d\d))?(?:,(?:19\d\d|20\d\d|21\d\d)(?:-(?:19\d\d|20\d\d|21\d\d))?)*(?:\/\d+)?)$/;
}

// Early exit validation strategies
export function isValidOptimized(cronExpression: string | Schedule): boolean {
  // Handle Schedule objects
  if (typeof cronExpression !== "string") {
    return isValidScheduleOptimized(cronExpression);
  }

  const expression = cronExpression.trim();

  // Quick checks for obvious invalid patterns
  if (!expression || expression.length > 200) return false;

  // Check cache first
  if (ValidationCache.isKnownValid(expression)) return true;
  if (ValidationCache.isKnownInvalid(expression)) return false;

  try {
    // Fast pattern matching before expensive parsing
    if (!quickPatternCheck(expression)) {
      ValidationCache.markInvalid(expression);
      return false;
    }

    // Try parsing with optimized error handling
    let schedule: Schedule;

    if (isJCronExpression(expression)) {
      schedule = fromJCronString(expression);
    } else {
      schedule = fromCronSyntax(expression);
    }

    // Additional validation
    if (!validateScheduleFields(schedule)) {
      ValidationCache.markInvalid(expression);
      return false;
    }

    ValidationCache.markValid(expression);
    return true;
  } catch (error) {
    ValidationCache.markInvalid(expression);
    return false;
  }
}

function quickPatternCheck(expression: string): boolean {
  // Count spaces to determine field count
  const parts = expression.split(/\s+/);

  // Basic field count validation
  if (parts.length < 6 || parts.length > 10) return false;

  // Quick regex check for basic cron pattern
  const basicFields = parts.slice(0, 6).join(" ");
  if (!ValidationPatterns.basicCronPattern.test(basicFields)) {
    // Try JCRON pattern if basic fails
    if (!ValidationPatterns.jcronPattern.test(expression)) {
      return false;
    }
  }

  return true;
}

function isJCronExpression(expression: string): boolean {
  return (
    expression.includes("TZ:") ||
    expression.includes("WOY:") ||
    expression.includes("EOD:")
  );
}

function isValidScheduleOptimized(schedule: Schedule): boolean {
  try {
    return validateScheduleFields(schedule);
  } catch {
    return false;
  }
}

function validateScheduleFields(schedule: Schedule): boolean {
  // Fast validation using pre-compiled regex
  if (schedule.s && !ValidationPatterns.validSecond.test(schedule.s))
    return false;
  if (schedule.m && !ValidationPatterns.validMinute.test(schedule.m))
    return false;
  if (schedule.h && !ValidationPatterns.validHour.test(schedule.h))
    return false;
  if (schedule.D && !ValidationPatterns.validDay.test(schedule.D)) return false;
  if (schedule.M && !ValidationPatterns.validMonth.test(schedule.M))
    return false;
  if (schedule.dow && !ValidationPatterns.validDow.test(schedule.dow))
    return false;
  if (schedule.Y && !ValidationPatterns.validYear.test(schedule.Y))
    return false;

  return true;
}

// Optimize validateCron function
export function validateCronOptimized(cronExpression: string | Schedule): {
  valid: boolean;
  errors: string[];
} {
  if (typeof cronExpression !== "string") {
    return { valid: isValidScheduleOptimized(cronExpression), errors: [] };
  }

  const expression = cronExpression.trim();
  const errors: string[] = [];

  // Quick validation
  if (!expression) {
    errors.push("Expression cannot be empty");
    return { valid: false, errors };
  }

  if (expression.length > 200) {
    errors.push("Expression too long");
    return { valid: false, errors };
  }

  // Check cache for known results
  if (ValidationCache.isKnownValid(expression)) {
    return { valid: true, errors: [] };
  }

  if (ValidationCache.isKnownInvalid(expression)) {
    errors.push("Known invalid expression");
    return { valid: false, errors };
  }

  // Detailed validation
  try {
    if (!quickPatternCheck(expression)) {
      errors.push("Invalid cron pattern format");
      return { valid: false, errors };
    }

    let schedule: Schedule;
    if (isJCronExpression(expression)) {
      schedule = fromJCronString(expression);
    } else {
      schedule = fromCronSyntax(expression);
    }

    if (!validateScheduleFields(schedule)) {
      errors.push("Invalid field values");
      return { valid: false, errors };
    }

    ValidationCache.markValid(expression);
    return { valid: true, errors: [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);
    ValidationCache.markInvalid(expression);
    return { valid: false, errors };
  }
}

// Optimize pattern detection
export function getPatternOptimized(
  cronExpression: string
): "daily" | "weekly" | "monthly" | "yearly" | "custom" {
  // Quick pattern detection without full parsing
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 6) return "custom";

  const [, , , D, M, dow] = parts;

  // Fast pattern matching
  if (dow !== "*" && (D === "*" || D === "?")) return "weekly";
  if (D !== "*" && D !== "?" && (dow === "*" || dow === "?")) {
    if (M !== "*") return "yearly";
    return "monthly";
  }
  if (M !== "*") return "yearly";
  if (dow === "*" && (D === "*" || D === "?")) return "daily";

  return "custom";
}

// Batch validation for better performance
export class BatchValidator {
  private results = new Map<string, { valid: boolean; errors: string[] }>();

  addExpression(id: string, expression: string): void {
    this.results.set(id, validateCronOptimized(expression));
  }

  getResult(id: string): { valid: boolean; errors: string[] } | undefined {
    return this.results.get(id);
  }

  getValidExpressions(): Map<string, string> {
    const valid = new Map<string, string>();
    for (const [id, result] of this.results) {
      if (result.valid) {
        valid.set(id, id); // Assuming id is the expression for simplicity
      }
    }
    return valid;
  }

  getInvalidExpressions(): Map<string, string[]> {
    const invalid = new Map<string, string[]>();
    for (const [id, result] of this.results) {
      if (!result.valid) {
        invalid.set(id, result.errors);
      }
    }
    return invalid;
  }

  clear(): void {
    this.results.clear();
  }

  getStats(): { total: number; valid: number; invalid: number } {
    let valid = 0;
    let invalid = 0;

    for (const result of this.results.values()) {
      if (result.valid) valid++;
      else invalid++;
    }

    return {
      total: this.results.size,
      valid,
      invalid,
    };
  }
}
