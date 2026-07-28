import type {
  SleepRecord,
  UserSettings,
  StreakState,
  ChronotypeResult,
} from "@/lib/types";
import { SDT_KEYS } from "@/lib/types";

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
// Internal helpers
// ============================================================================

type SetOutcome = { ok: true } | { ok: false; error: "STORAGE_FULL" };

function safeSet<T>(key: string, value: T): SetOutcome {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: "STORAGE_FULL" };
  }
}

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function computeSleepMinutes(bedTime: string, wakeTime: string): number {
  const [bedH, bedM] = bedTime.split(":").map(Number);
  const [wakeH, wakeM] = wakeTime.split(":").map(Number);
  const bedTotal = bedH * 60 + bedM;
  const wakeTotal = wakeH * 60 + wakeM;
  return wakeTotal > bedTotal ? wakeTotal - bedTotal : 24 * 60 - bedTotal + wakeTotal;
}

// ============================================================================
// Records (sdt.records.v1)
// ============================================================================

// AC-1 (F1-AC6): Recover from corrupted JSON by returning empty object
export function getRecords(): Record<string, SleepRecord> {
  return safeGet<Record<string, SleepRecord>>(SDT_KEYS.records, {});
}

/**
 * AC-2 (F1-AC5): Handle QuotaExceededError without throwing
 */
export function setRecords(records: Record<string, SleepRecord>): SetOutcome {
  return safeSet(SDT_KEYS.records, records);
}

/**
 * AC-3 (F1-AC4): Save record with computed fields (sleepMinutes, debtMinutes)
 * and timestamps (createdAt, updatedAt). Overwrite if same id exists.
 */
export function saveRecord(
  input: { id: string; bedTime: string; wakeTime: string },
  targetMinutes: number
): SetOutcome {
  const records = getRecords();
  const existing = records[input.id];
  const sleepMinutes = computeSleepMinutes(input.bedTime, input.wakeTime);
  const debtMinutes = targetMinutes - sleepMinutes;
  const now = Date.now();

  const record: SleepRecord = {
    id: input.id,
    bedTime: input.bedTime,
    wakeTime: input.wakeTime,
    sleepMinutes,
    debtMinutes,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  records[input.id] = record;
  return setRecords(records);
}

// ============================================================================
// Settings (sdt.settings.v1)
// ============================================================================

export function getSettings(): UserSettings | null {
  return safeGet<UserSettings | null>(SDT_KEYS.settings, null);
}

export function setSettings(settings: UserSettings): SetOutcome {
  return safeSet(SDT_KEYS.settings, settings);
}

// ============================================================================
// Streak (sdt.streak.v1)
// ============================================================================

/**
 * AC-4 (F6-AC6): Return default streak when key is missing
 */
export function getStreak(): {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
} {
  const stored = safeGet<StreakState | null>(SDT_KEYS.streak, null);
  if (!stored) {
    return { currentStreak: 0, longestStreak: 0, lastCheckInDate: null };
  }
  return {
    currentStreak: stored.currentStreak,
    longestStreak: stored.longestStreak,
    lastCheckInDate: stored.lastRecordDate ?? null,
  };
}

export function setStreak(streak: StreakState): SetOutcome {
  return safeSet(SDT_KEYS.streak, streak);
}

function isNextCalendarDay(prevDateISO: string, dateISO: string): boolean {
  const [py, pm, pd] = prevDateISO.split("-").map(Number);
  const [y, m, d] = dateISO.split("-").map(Number);
  const prev = Date.UTC(py, pm - 1, pd);
  const cur = Date.UTC(y, m - 1, d);
  return cur - prev === 24 * 60 * 60 * 1000;
}

/**
 * F6-AC1/AC2/AC3/AC4: 기록 저장 시 연속 체크인 스트릭을 갱신한다.
 * - 전날 체크인이면 currentStreak +1, 하루라도 건너뛰면 1로 리셋
 * - 같은 날 재저장은 변동 없음(중복 카운트 방지)
 * - longestStreak는 currentStreak가 갱신될 때만 따라 갱신
 */
export function checkInStreak(dateISO: string): {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null;
} {
  const current = getStreak();

  if (current.lastCheckInDate === dateISO) {
    return current;
  }

  const currentStreak =
    current.lastCheckInDate !== null && isNextCalendarDay(current.lastCheckInDate, dateISO)
      ? current.currentStreak + 1
      : 1;
  const longestStreak = Math.max(current.longestStreak, currentStreak);

  setStreak({
    currentStreak,
    longestStreak,
    lastRecordDate: dateISO,
    updatedAt: Date.now(),
  });

  return { currentStreak, longestStreak, lastCheckInDate: dateISO };
}

// ============================================================================
// Chronotype (sdt.chronotype.v1)
// ============================================================================

export function getChronotype(): ChronotypeResult | null {
  return safeGet<ChronotypeResult | null>(SDT_KEYS.chronotype, null);
}

export function setChronotype(chronotype: ChronotypeResult | null): SetOutcome {
  return safeSet(SDT_KEYS.chronotype, chronotype);
}

// ============================================================================
// Reward unlock (sdt.rewardUnlock.v1)
// ============================================================================

export type RewardUnlockState = { report: string | null; plan: string | null };

export function getRewardUnlock(): RewardUnlockState {
  return safeGet<RewardUnlockState>(SDT_KEYS.rewardUnlock, {
    report: null,
    plan: null,
  });
}

export function setRewardUnlock(state: RewardUnlockState): SetOutcome {
  return safeSet(SDT_KEYS.rewardUnlock, state);
}
