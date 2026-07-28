import type { ComputeResult } from "./types";

// ============================================================================
// 수면 부채 계산 엔진 (packet-0003)
// 결정론적 순수 함수 모음. 시간·부채·상환·회복플랜·ISO 주키 계산.
// 모든 함수는 NaN/음수 입력을 0으로 클램프하며 절대 NaN을 저장하지 않는다.
// ============================================================================

/**
 * AC-1 (F1-AC1): 기본 수면 시간 계산
 * Given targetMinutes = 480 (8시간)
 * When computeSleep({ bedTime: "23:30", wakeTime: "06:30" }) 호출
 * Then sleepMinutes = 420 (7시간), debtMinutes = 60 반환
 *
 * AC-2 (F1-AC2): 자정 교차 처리
 * Given 취침이 기상보다 늦은 값 (예: 01:00 ~ 07:00 또는 22:00 ~ 05:00)
 * When computeSleep({ bedTime: "22:00", wakeTime: "05:00" }) 호출
 * Then wakeTime을 익일로 처리해 sleepMinutes = 420 반환
 * Spec: "기상 < 취침"이면 익일 기상으로 간주해 +1440분 처리
 *
 * @param times - { bedTime: "HH:mm", wakeTime: "HH:mm" }
 * @param targetMinutes - 목표 수면 시간(분), default 480, 범위 240~720
 * @returns { sleepMinutes: number, debtMinutes: number }
 */
export function computeSleep(
  times: { bedTime: string; wakeTime: string },
  targetMinutes: number
): ComputeResult {
  // TODO: Implement
  return { sleepMinutes: 0, debtMinutes: 0 };
}

/**
 * AC-3 (F1-AC3): 누적 부채 합산
 * Given records에 debtMinutes 값이 [60, -30, 120]인 경우
 * When getTotalDebt(records) 호출
 * Then 150(분) 반환 (60 - 30 + 120 = 150, 초과수면 -30 상쇄)
 * 결과는 max(0, sum) 클램프 (음수 합은 0으로 처리)
 *
 * @param records - SleepRecord[] 또는 { debtMinutes: number }[]
 * @returns number - 누적 부채(분), 최소 0
 */
export function getTotalDebt(records: Array<{ debtMinutes: number }>): number {
  // TODO: Implement
  return 0;
}

/**
 * AC-7 (F1-AC7): 상환 예상일 계산
 * Given totalDebt = 300, recoveryRatePerDay = 30
 * When getPayoffDays(300, 30) 호출
 * Then 10(일) 반환
 * 특수: totalDebt = 0이면 0 반환
 *
 * @param totalDebt - 누적 부채(분)
 * @param recoveryRatePerDay - 하루 상환 가능 분(분), default 30, 범위 10~120
 * @returns number - 상환 예상일, 최소 0
 */
export function getPayoffDays(totalDebt: number, recoveryRatePerDay: number): number {
  // TODO: Implement
  return 0;
}

export interface RecoveryPlanDay {
  dayOfWeek: string; // "Saturday", "Sunday"
  recommendedBedTime: string; // "HH:mm"
  recommendedWakeTime: string; // "HH:mm"
  additionalMinutes: number; // 추가 수면(분)
}

export interface RecoveryPlanResult {
  days: RecoveryPlanDay[];
}

/**
 * F5-AC1: 회복 플랜 계산
 * Given totalDebt = 300분, targetBedTime = "23:30"
 * When buildRecoveryPlan({totalDebt, targetBedTime}) 호출
 * Then 토·일 추가 수면 합이 min(totalDebt, 240)분 이내로 분배되고
 *      각 요일 권장 취침/기상 시각 반환
 *      1회 몰아자기 상한 하루 120분
 *
 * @param config - { totalDebt: number, targetBedTime: string }
 * @returns RecoveryPlanResult - { days: [Saturday, Sunday] }
 */
export function buildRecoveryPlan(config: {
  totalDebt: number;
  targetBedTime: string;
}): RecoveryPlanResult {
  // TODO: Implement
  return { days: [] };
}

/**
 * F5-AC1c: ISO 주키 유틸
 * Given ISO 날짜 문자열 (예: "2026-07-29")
 * When getWeekKey("2026-07-29") 호출
 * Then "YYYY-Www" 형식 반환 (월요일 시작, ISO 8601 주차)
 * 예: "2026-W31" (2026년 31주, 월요일 기준)
 *
 * @param dateISO - ISO 날짜 문자열 "YYYY-MM-DD"
 * @returns string - ISO 주키 "YYYY-Www" 형식
 */
export function getWeekKey(dateISO: string): string {
  // TODO: Implement
  return "";
}
