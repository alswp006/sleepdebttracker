import { describe, it, expect } from "vitest";
import type { ComputeResult } from "@/lib/types";
import {
  computeSleep,
  getTotalDebt,
  getPayoffDays,
  buildRecoveryPlan,
  getWeekKey,
} from "@/lib/sleepEngine";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They WILL fail until src/lib/sleepEngine.ts
// is fully implemented. The tests define the expected behavior for:
// - AC-1 (F1-AC1): computeSleep({bedTime:'23:30',wakeTime:'06:30'},480)→{sleepMinutes:420,debtMinutes:60}
// - AC-2 (F1-AC2): 자정 교차 - {'01:00','07:00'}→sleepMinutes 360
// - AC-3 (F1-AC3): getTotalDebt([60,-30,120])→150, 결과 max(0,sum) 클램프
// - AC-7 (F1-AC7): getPayoffDays(300,30)→10, getPayoffDays(0,rate)→0
// - AC-8 (F1-AC8): 모든 함수 NaN/음수 입력 시 0 클램프
// - F5-AC1: buildRecoveryPlan(), getWeekKey('YYYY-Www' ISO 주 형식)
// ============================================================================

describe("수면 부채 계산 엔진 + ISO 주키 유틸 (packet-0003)", () => {
  // ──────────────────────────────────────────────────────────────────────────
  // AC-1 (F1-AC1): 기본 수면 시간 계산
  // Given targetMinutes = 480 (8시간)
  // When computeSleep({ bedTime: "23:30", wakeTime: "06:30" }) 호출
  // Then sleepMinutes = 420 (7시간), debtMinutes = 60 반환
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: computeSleep calculates sleep and debt for normal bedtime", () => {
    // Arrange & Act
    const result = computeSleep({ bedTime: "23:30", wakeTime: "06:30" }, 480);

    // Assert: 23:30 ~ 06:30 next day = 7 hours = 420 minutes
    expect(result).toBeDefined();
    expect(result.sleepMinutes).toBe(420);
    expect(result.debtMinutes).toBe(60); // 480 - 420 = 60
    expect(typeof result.sleepMinutes).toBe("number");
    expect(typeof result.debtMinutes).toBe("number");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-2 (F1-AC2): 자정 교차 처리
  // Given 취침이 기상보다 늦은 값 (예: 01:00 ~ 07:00)
  // When computeSleep({ bedTime: "01:00", wakeTime: "07:00" }) 호출
  // Then sleepMinutes = 360 (6시간) 반환 (음수 없이 익일 처리)
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: computeSleep handles midnight crossing correctly", () => {
    // Arrange & Act
    const result = computeSleep({ bedTime: "01:00", wakeTime: "07:00" }, 480);

    // Assert: 01:00 ~ 07:00 = 6 hours = 360 minutes
    // When wakeTime < bedTime (01:00 < 07:00 is false, so no crossing issue)
    // Actually 01:00 < 07:00 is true, so it's same day
    // Let me reconsider: if bedTime is "01:00" and wakeTime is "07:00",
    // it means went to bed at 1 AM and woke up at 7 AM = 6 hours
    // The spec says: "기상 < 취침"이면 익일 기상으로 간주해 +1440분
    // So if bedTime="23:00" and wakeTime="01:00", then wakeTime < bedTime
    // In this case: 01:00 (next day) - 23:00 (previous day) = 2 hours
    // So we need: bedTime > wakeTime to trigger the crossing logic
    // Let's use bedTime="01:00" wakeTime="07:00" - no crossing (same day next morning)
    // sleepMinutes = 7 - 1 = 6 hours = 360 minutes
    expect(result.sleepMinutes).toBe(360);
    expect(result.debtMinutes).toBe(120); // 480 - 360 = 120
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-2b: 실제 자정 교차 테스트
  // Given bedTime > wakeTime (예: 22:00 ~ 05:00 is next day crossing)
  // When computeSleep({ bedTime: "22:00", wakeTime: "05:00" }) 호출
  // Then wakeTime을 익일로 처리해 sleepMinutes = 7시간 = 420분 반환
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-2b[P0]: computeSleep adds 1440 minutes when wakeTime < bedTime (crossing midnight)", () => {
    // Arrange & Act
    const result = computeSleep({ bedTime: "22:00", wakeTime: "05:00" }, 480);

    // Assert: 22:00 ~ 05:00 (next day) = 7 hours = 420 minutes
    // bedTime=22:00 in minutes = 22*60 = 1320
    // wakeTime=05:00 in minutes = 5*60 = 300
    // Since wakeTime < bedTime, add 1440: 300 + 1440 = 1740
    // sleepMinutes = 1740 - 1320 = 420 (7 hours)
    expect(result.sleepMinutes).toBe(420);
    expect(result.debtMinutes).toBe(60); // 480 - 420 = 60
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-3 (F1-AC3): 누적 부채 합산 및 클램프
  // Given records에 debtMinutes 값이 [60, -30, 120]인 경우
  // When getTotalDebt(records) 호출
  // Then 150(분) 반환 (60 - 30 + 120 = 150, 초과수면 -30 상쇄, 최소 0으로 클램프)
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-3[P0]: getTotalDebt sums debt records and clamps to minimum 0", () => {
    // Arrange
    const records = [
      { id: "2026-07-27", debtMinutes: 60 },
      { id: "2026-07-28", debtMinutes: -30 }, // 초과수면
      { id: "2026-07-29", debtMinutes: 120 },
    ];

    // Act
    const result = getTotalDebt(records);

    // Assert: 60 + (-30) + 120 = 150
    expect(result).toBe(150);
    expect(typeof result).toBe("number");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-3b: getTotalDebt는 음수로 클램프하지 않음 (음수도 반환 가능)
  // 하지만 합이 음수가 될 수 없도록 최소 0으로 클램프
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-3b[P0]: getTotalDebt clamps negative totals to 0", () => {
    // Arrange: 모든 초과수면으로 합이 음수가 되는 경우
    const records = [
      { id: "2026-07-27", debtMinutes: -50 },
      { id: "2026-07-28", debtMinutes: -40 },
    ];

    // Act
    const result = getTotalDebt(records);

    // Assert: -50 + (-40) = -90, but clamp to 0
    expect(result).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-7 (F1-AC7): 상환 예상일 계산
  // Given totalDebt = 300, recoveryRatePerDay = 30
  // When getPayoffDays(300, 30) 호출
  // Then 10(일) 반환. totalDebt = 0이면 0 반환
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-7a[P0]: getPayoffDays calculates days to payoff debt", () => {
    // Arrange & Act
    const result = getPayoffDays(300, 30);

    // Assert: 300 / 30 = 10 days
    expect(result).toBe(10);
    expect(typeof result).toBe("number");
  });

  it("AC-7b[P0]: getPayoffDays returns 0 when totalDebt is 0", () => {
    // Arrange & Act
    const result = getPayoffDays(0, 30);

    // Assert
    expect(result).toBe(0);
  });

  it("AC-7c[P0]: getPayoffDays returns correct value for fractional division", () => {
    // Arrange & Act
    const result = getPayoffDays(100, 30);

    // Assert: 100 / 30 = 3.333... → floor or ceil?
    // Spec says "10일", suggesting integer division (ceil for optimistic estimate)
    // Let's assume ceiling: ceil(100/30) = ceil(3.333) = 4
    // Or floor: floor(100/30) = 3
    // Most likely: Math.ceil for "약 Xdays" estimate
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(4);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-8 (F1-AC8): NaN/음수 입력 시 0 클램프
  // Given 모든 함수에 NaN 또는 음수 입력
  // When 함수 호출
  // Then 0을 반환하고 절대 NaN을 저장하지 않음
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-8a[P0]: computeSleep returns 0 for NaN targetMinutes", () => {
    // Arrange & Act
    const result = computeSleep({ bedTime: "23:30", wakeTime: "06:30" }, NaN);

    // Assert: Should clamp to 0, not NaN
    expect(result.sleepMinutes).toBe(420); // sleepMinutes is still computed
    expect(result.debtMinutes).toBe(0); // debtMinutes = NaN - 420 → clamp to 0
    expect(isNaN(result.sleepMinutes)).toBe(false);
    expect(isNaN(result.debtMinutes)).toBe(false);
  });

  it("AC-8b[P0]: computeSleep returns 0 for negative targetMinutes", () => {
    // Arrange & Act
    const result = computeSleep({ bedTime: "23:30", wakeTime: "06:30" }, -100);

    // Assert: negative targetMinutes should be clamped to 0
    expect(result.debtMinutes).toBe(0); // max(0, -100 - 420) = 0
    expect(isNaN(result.debtMinutes)).toBe(false);
  });

  it("AC-8c[P0]: getTotalDebt returns 0 for empty records", () => {
    // Arrange & Act
    const result = getTotalDebt([]);

    // Assert
    expect(result).toBe(0);
    expect(isNaN(result)).toBe(false);
  });

  it("AC-8d[P0]: getPayoffDays returns 0 for NaN inputs", () => {
    // Arrange & Act
    const result1 = getPayoffDays(NaN, 30);
    const result2 = getPayoffDays(100, NaN);

    // Assert: Should clamp to 0, not NaN
    expect(result1).toBe(0);
    expect(result2).toBe(0);
    expect(isNaN(result1)).toBe(false);
    expect(isNaN(result2)).toBe(false);
  });

  it("AC-8e[P0]: getPayoffDays returns 0 for negative inputs", () => {
    // Arrange & Act
    const result1 = getPayoffDays(-100, 30);
    const result2 = getPayoffDays(100, -30);

    // Assert: Should clamp to 0, not negative
    expect(result1).toBe(0);
    expect(result2).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // F5-AC1: 회복 플랜 계산
  // Given totalDebt = 300분, targetBedTime = "23:30"
  // When buildRecoveryPlan({totalDebt, targetBedTime}) 호출
  // Then 토·일 추가 수면 합이 min(totalDebt, 240)분 이내로 분배되고
  //      각 요일 권장 취침/기상 시각 반환
  //      1회 몰아자기 상한 하루 120분
  // ──────────────────────────────────────────────────────────────────────────

  it("F5-AC1a[P0]: buildRecoveryPlan distributes recovery sleep within limits", () => {
    // Arrange & Act
    const plan = buildRecoveryPlan({ totalDebt: 300, targetBedTime: "23:30" });

    // Assert: Plan should have results for Saturday and Sunday
    expect(plan).toBeDefined();
    expect(plan.days).toBeDefined();
    expect(plan.days.length).toBeGreaterThanOrEqual(2); // At least Sat & Sun

    // Total additional sleep should not exceed min(totalDebt, 240) = 240
    const totalRecoveryMinutes = plan.days.reduce((sum: number, day: any) => sum + (day.additionalMinutes || 0), 0);
    expect(totalRecoveryMinutes).toBeLessThanOrEqual(240);
    expect(totalRecoveryMinutes).toBeGreaterThan(0);

    // Each day should have recommended bedtime and wakeTime
    plan.days.forEach((day: any) => {
      expect(day.dayOfWeek).toBeDefined(); // "Saturday" or "Sunday"
      expect(day.recommendedBedTime).toMatch(/^\d{2}:\d{2}$/); // HH:mm format
      expect(day.recommendedWakeTime).toMatch(/^\d{2}:\d{2}$/); // HH:mm format
      expect(day.additionalMinutes).toBeLessThanOrEqual(120); // Per-day limit
    });
  });

  it("F5-AC1b[P0]: buildRecoveryPlan respects per-day 120-minute limit", () => {
    // Arrange & Act
    const plan = buildRecoveryPlan({ totalDebt: 600, targetBedTime: "23:30" });

    // Assert: Each day should have max 120 minutes additional sleep
    plan.days.forEach((day: any) => {
      expect(day.additionalMinutes).toBeLessThanOrEqual(120);
      expect(day.additionalMinutes).toBeGreaterThanOrEqual(0);
    });

    // Total should be clamped to 240 (min(600, 240))
    const totalRecoveryMinutes = plan.days.reduce((sum: number, day: any) => sum + (day.additionalMinutes || 0), 0);
    expect(totalRecoveryMinutes).toBeLessThanOrEqual(240);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // F5-AC1c: getWeekKey 유틸
  // Given ISO 날짜 문자열 (예: "2026-07-29")
  // When getWeekKey("2026-07-29") 호출
  // Then "YYYY-Www" 형식 반환 (월요일 시작, ISO 8601 주차)
  // 예: "2026-W31" (2026년 31주, 월요일 기준)
  // ──────────────────────────────────────────────────────────────────────────

  it("F5-AC1c[P0]: getWeekKey returns ISO week string YYYY-Www format", () => {
    // Arrange & Act
    // 2026-07-29는 수요일, ISO 주는 W31
    const weekKey = getWeekKey("2026-07-29");

    // Assert: ISO 8601 week format (Monday-start)
    expect(weekKey).toMatch(/^\d{4}-W\d{2}$/); // "YYYY-Www" format
    expect(weekKey).toBe("2026-W31"); // 2026-07-29 is in week 31
  });

  it("F5-AC1d[P0]: getWeekKey handles different weeks consistently", () => {
    // Arrange & Act
    const week1 = getWeekKey("2026-07-20"); // Monday of week 30
    const week2 = getWeekKey("2026-07-26"); // Sunday of week 30
    const week3 = getWeekKey("2026-07-27"); // Monday of week 31

    // Assert: Same week should return same week key
    expect(week1).toBe(week2); // Both in week 30
    expect(week1).not.toBe(week3); // Different weeks
    expect(week1).toMatch(/^\d{4}-W30$/);
    expect(week3).toMatch(/^\d{4}-W31$/);
  });
});

