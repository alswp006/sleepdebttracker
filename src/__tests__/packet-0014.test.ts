import { describe, it, expect, beforeEach } from "vitest";
import { checkInStreak } from "@/lib/storage";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";
import type { StreakState } from "@/lib/types";

// ============================================================================
// F6. 연속 기록 스트릭 — 저장 시 checkInStreak() 갱신 로직 (spec.md F6-AC1~AC4)
// ============================================================================

describe("checkInStreak (packet-0014)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("F6-AC1[P0]: 전날 체크인 다음 날 저장하면 currentStreak이 1 증가한다", () => {
    const seed: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastRecordDate: "2026-07-28",
      updatedAt: 1000,
    };
    seedLocalStorage({ [SDT_KEYS.streak]: seed });

    const result = checkInStreak("2026-07-29");

    expect(result.currentStreak).toBe(4);
    expect(result.lastCheckInDate).toBe("2026-07-29");
  });

  it("F6-AC2[P0]: 하루라도 건너뛰면 currentStreak이 1로 리셋된다", () => {
    const seed: StreakState = {
      currentStreak: 5,
      longestStreak: 5,
      lastRecordDate: "2026-07-27",
      updatedAt: 1000,
    };
    seedLocalStorage({ [SDT_KEYS.streak]: seed });

    const result = checkInStreak("2026-07-29");

    expect(result.currentStreak).toBe(1);
  });

  it("F6-AC3[P1]: 같은 날 재저장은 currentStreak이 변동 없다", () => {
    const seed: StreakState = {
      currentStreak: 4,
      longestStreak: 4,
      lastRecordDate: "2026-07-29",
      updatedAt: 1000,
    };
    seedLocalStorage({ [SDT_KEYS.streak]: seed });

    const result = checkInStreak("2026-07-29");

    expect(result.currentStreak).toBe(4);
  });

  it("F6-AC4[P0]: currentStreak이 longestStreak를 초과하면 longestStreak가 갱신된다", () => {
    const seed: StreakState = {
      currentStreak: 3,
      longestStreak: 3,
      lastRecordDate: "2026-07-28",
      updatedAt: 1000,
    };
    seedLocalStorage({ [SDT_KEYS.streak]: seed });

    const result = checkInStreak("2026-07-29");

    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  it("F6-AC6[P1]: 스트릭 키가 없을 때 최초 저장은 currentStreak=1로 안전 초기화된다", () => {
    const result = checkInStreak("2026-07-29");

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
  });
});
