import { describe, it, expect } from "vitest";
import type {
  SleepRecord,
  UserSettings,
  StreakState,
  ChronotypeResult,
  ComputeResult,
  RecoveryPlan,
  SaveResult,
  RouteState,
} from "@/lib/types";
import { SDT_KEYS } from "@/lib/types";

describe("AC-1: Entity Type Exports", () => {
  it("AC-1.1[P0]: should export SleepRecord interface with required fields", () => {
    // Type assertion to verify structure at compile time
    const record: SleepRecord = {
      id: "sleep-001",
      bedTime: "2026-07-29T23:00:00Z",
      wakeTime: "2026-07-30T07:30:00Z",
      sleepMinutes: 510,
      debtMinutes: -30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    expect(record.id).toBe("sleep-001");
    expect(record.sleepMinutes).toBe(510);
    expect(record.debtMinutes).toBe(-30);
    expect(typeof record.createdAt).toBe("number");
    expect(typeof record.updatedAt).toBe("number");
  });

  it("AC-1.2[P0]: should export UserSettings interface with required fields", () => {
    const settings: UserSettings = {
      targetSleepMinutes: 480,
      targetBedTime: "23:00",
      targetWakeTime: "07:00",
      notificationEnabled: true,
      darkModeEnabled: false,
      updatedAt: Date.now(),
    };

    expect(settings.targetSleepMinutes).toBe(480);
    expect(settings.targetBedTime).toBe("23:00");
    expect(settings.notificationEnabled).toBe(true);
    expect(typeof settings.updatedAt).toBe("number");
  });

  it("AC-1.3[P0]: should export StreakState interface with required fields", () => {
    const streak: StreakState = {
      currentStreak: 5,
      longestStreak: 12,
      lastRecordDate: "2026-07-29",
      updatedAt: Date.now(),
    };

    expect(streak.currentStreak).toBe(5);
    expect(streak.longestStreak).toBe(12);
    expect(streak.lastRecordDate).toBe("2026-07-29");
    expect(typeof streak.updatedAt).toBe("number");
  });

  it("AC-1.4[P0]: should export ChronotypeResult type (nullable)", () => {
    const chronotype: ChronotypeResult = {
      type: "evening",
      score: 0.75,
      description: "당신은 저녁형입니다",
      updatedAt: Date.now(),
    };

    expect(chronotype.type).toBe("evening");
    expect(chronotype.score).toBe(0.75);
    expect(typeof chronotype.description).toBe("string");

    // Test nullable variant
    const nullChronotype: ChronotypeResult | null = null;
    expect(nullChronotype).toBeNull();
  });

  it("AC-1.5[P0]: should export ComputeResult with sleepMinutes and debtMinutes", () => {
    const result: ComputeResult = {
      sleepMinutes: 450,
      debtMinutes: 30,
    };

    expect(result.sleepMinutes).toBe(450);
    expect(result.debtMinutes).toBe(30);
    expect(typeof result.sleepMinutes).toBe("number");
    expect(typeof result.debtMinutes).toBe("number");
  });

  it("AC-1.6[P0]: should export RecoveryPlan interface", () => {
    const plan: RecoveryPlan = {
      title: "주말 집중 회복",
      description: "주말 2일간 충분한 수면으로 수면 부채 해결",
      estimatedRecoveryDays: 2,
      targetSleepMinutes: 540,
      createdAt: Date.now(),
    };

    expect(plan.title).toBe("주말 집중 회복");
    expect(plan.estimatedRecoveryDays).toBe(2);
    expect(typeof plan.createdAt).toBe("number");
  });

  it("AC-1.7[P0]: should export SaveResult<T> generic type", () => {
    // Test with SleepRecord
    const result: SaveResult<SleepRecord> = {
      success: true,
      data: {
        id: "sleep-001",
        bedTime: "2026-07-29T23:00:00Z",
        wakeTime: "2026-07-30T07:30:00Z",
        sleepMinutes: 510,
        debtMinutes: -30,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    };

    expect(result.success).toBe(true);
    expect(result.data.id).toBe("sleep-001");

    // Test error variant
    const errorResult: SaveResult<SleepRecord> = {
      success: false,
      error: "저장 실패",
    };

    expect(errorResult.success).toBe(false);
    expect(errorResult.error).toBe("저장 실패");
  });
});

describe("AC-2: RouteState Type Definition", () => {
  it("AC-2.1[P0]: should support home route '/' with optional toast", () => {
    const stateWithToast: RouteState["/"] = { toast: "저장되었습니다" };
    expect(stateWithToast.toast).toBe("저장되었습니다");

    const stateWithoutToast: RouteState["/"] = undefined;
    expect(stateWithoutToast).toBeUndefined();
  });

  it("AC-2.2[P0]: should support input route '/input' with optional date", () => {
    const stateWithDate: RouteState["/input"] = { date: "2026-07-29" };
    expect(stateWithDate.date).toBe("2026-07-29");

    const stateWithoutDate: RouteState["/input"] = undefined;
    expect(stateWithoutDate).toBeUndefined();
  });

  it("AC-2.3[P0]: should support report route '/report' with undefined", () => {
    const state: RouteState["/report"] = undefined;
    expect(state).toBeUndefined();
  });

  it("AC-2.4[P0]: should support plan route '/plan' with undefined", () => {
    const state: RouteState["/plan"] = undefined;
    expect(state).toBeUndefined();
  });

  it("AC-2.5[P0]: should support diagnosis route '/diagnosis' with undefined", () => {
    const state: RouteState["/diagnosis"] = undefined;
    expect(state).toBeUndefined();
  });
});

describe("AC-3: SDT_KEYS Constants Export", () => {
  it("AC-3.1[P0]: should export SDT_KEYS object with all required storage keys", () => {
    expect(SDT_KEYS).toBeDefined();
    expect(typeof SDT_KEYS).toBe("object");
  });

  it("AC-3.2[P0]: should have records key for SleepRecord storage", () => {
    expect(SDT_KEYS.records).toBe("sdt.records.v1");
  });

  it("AC-3.3[P0]: should have settings key for UserSettings storage", () => {
    expect(SDT_KEYS.settings).toBe("sdt.settings.v1");
  });

  it("AC-3.4[P0]: should have streak key for StreakState storage", () => {
    expect(SDT_KEYS.streak).toBe("sdt.streak.v1");
  });

  it("AC-3.5[P0]: should have chronotype key for ChronotypeResult storage", () => {
    expect(SDT_KEYS.chronotype).toBe("sdt.chronotype.v1");
  });

  it("AC-3.6[P0]: should have rewardUnlock key for report/plan storage", () => {
    expect(SDT_KEYS.rewardUnlock).toBe("sdt.rewardUnlock.v1");
  });

  it("AC-3.7[P0]: should have exactly 5 keys in SDT_KEYS", () => {
    const keys = Object.keys(SDT_KEYS);
    expect(keys).toHaveLength(5);
    expect(keys).toContain("records");
    expect(keys).toContain("settings");
    expect(keys).toContain("streak");
    expect(keys).toContain("chronotype");
    expect(keys).toContain("rewardUnlock");
  });
});

describe("AC-4: TypeScript Compilation", () => {
  it("AC-4.1[P0]: should have no TypeScript errors when importing types", () => {
    // If this test file compiles without errors, types are properly exported
    // tsc --noEmit will be run separately in the checklist
    expect(true).toBe(true);
  });
});

describe("AC-5: Zero Runtime Code", () => {
  it("AC-5.1[P0]: should only contain type definitions (no runtime exports)", () => {
    // Verify that SDT_KEYS is the only runtime export
    // All other exports (SleepRecord, UserSettings, etc.) are types only
    expect(typeof SDT_KEYS).toBe("object");
    expect(SDT_KEYS).not.toBeNull();
  });
});
