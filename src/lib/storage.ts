import type { SleepRecord, StreakState, SDT_KEYS } from "@/lib/types";

// ============================================================================
// Generic key-value helpers
// ============================================================================

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// ============================================================================
// Packet-0002: Entity-specific CRUD operations with safety guards
// ============================================================================

/**
 * AC-1 (F1-AC6): Recover from corrupted JSON by returning empty object
 * No console.error logging.
 */
export function getRecords(): Record<string, SleepRecord> {
  // TODO: Implement
  throw new Error("Not implemented");
}

/**
 * AC-2 (F1-AC5): Handle QuotaExceededError without throwing
 */
export function setRecords(
  records: Record<string, SleepRecord>
): { ok: true } | { ok: false; error: "STORAGE_FULL" } {
  // TODO: Implement
  throw new Error("Not implemented");
}

/**
 * AC-3 (F1-AC4): Save record with computed fields (sleepMinutes, debtMinutes)
 * and timestamps (createdAt, updatedAt). Overwrite if same id exists.
 */
export function saveRecord(
  input: { id: string; bedTime: string; wakeTime: string },
  targetMinutes: number
): { ok: true } | { ok: false; error: "STORAGE_FULL" } {
  // TODO: Implement
  throw new Error("Not implemented");
}

/**
 * AC-4 (F6-AC6): Return default streak when key is missing
 */
export function getStreak(): {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
} {
  // TODO: Implement
  throw new Error("Not implemented");
}

/**
 * Streak setter
 */
export function setStreak(streak: StreakState): void {
  // TODO: Implement
  throw new Error("Not implemented");
}
