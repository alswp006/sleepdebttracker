// Entity: Sleep record with computed metrics
export interface SleepRecord {
  id: string;
  bedTime: string;
  wakeTime: string;
  sleepMinutes: number;
  debtMinutes: number;
  createdAt: number;
  updatedAt: number;
}

// Entity: User preferences
export interface UserSettings {
  targetSleepMinutes: number;
  targetBedTime: string;
  targetWakeTime: string;
  notificationEnabled: boolean;
  darkModeEnabled: boolean;
  updatedAt: number;
}

// Entity: Sleep streak tracking
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastRecordDate: string;
  updatedAt: number;
}

// Entity: Chronotype analysis result
export interface ChronotypeResult {
  type: string;
  score: number;
  description: string;
  updatedAt: number;
}

// Compute result: time metrics
export interface ComputeResult {
  sleepMinutes: number;
  debtMinutes: number;
}

// Entity: Recovery recommendation plan
export interface RecoveryPlan {
  title: string;
  description: string;
  estimatedRecoveryDays: number;
  targetSleepMinutes: number;
  createdAt: number;
}

// Generic result wrapper
export type SaveResult<T> = { success: true; data: T } | { success: false; error: string };

// Route state per navigation path
export type RouteState = {
  "/": { toast?: string } | undefined;
  "/input": { date?: string } | undefined;
  "/report": undefined;
  "/plan": undefined;
  "/diagnosis": undefined;
};

// localStorage keys (versioned, scoped)
export const SDT_KEYS = {
  records: "sdt.records.v1",
  settings: "sdt.settings.v1",
  streak: "sdt.streak.v1",
  chronotype: "sdt.chronotype.v1",
  rewardUnlock: "sdt.rewardUnlock.v1",
} as const;
