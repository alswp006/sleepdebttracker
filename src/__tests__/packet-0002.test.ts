import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SleepRecord, StreakState } from "@/lib/types";
import {
  getRecords,
  setRecords,
  saveRecord,
  getStreak,
  setStreak,
} from "@/lib/storage";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They WILL fail until src/lib/storage.ts
// is fully implemented. The tests define the expected behavior for:
// - AC-1 (F1-AC6): getRecords() handles corrupted JSON without logging console.error
// - AC-2 (F1-AC5): set* functions return {ok:false,error:'STORAGE_FULL'} on QuotaExceededError
// - AC-3 (F1-AC4): saveRecord() stores record with computed fields + timestamps
// - AC-4 (F6-AC6): getStreak() returns default when key is missing
// ============================================================================

describe("localStorage 안전 CRUD 저장소 유틸 (packet-0002)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // AC-1: 손상된 저장 데이터 복구 (F1-AC6)
  // Given `sdt.records.v1` 값이 파싱 불가한 문자열 `"{bad"`일 때
  // When `getRecords()` 호출
  // Then 빈 객체 `{}` 반환하고 `console.error` 미출력
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-1a: getRecords returns {} when stored JSON is malformed", () => {
    // Arrange: Store corrupted JSON
    localStorage.setItem("sdt.records.v1", "{bad");

    // Act
    const result = getRecords();

    // Assert: Should return empty object, not throw
    expect(result).toEqual({});
    expect(typeof result).toBe("object");
  });

  it("AC-1b: getRecords does not log console.error on parse failure", () => {
    // Arrange
    localStorage.setItem("sdt.records.v1", "{bad");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act
    getRecords();

    // Assert: console.error should NOT be called
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });


  // ──────────────────────────────────────────────────────────────────────────
  // AC-2: localStorage 용량 초과 (F1-AC5)
  // Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  // When `saveRecord` 또는 다른 set* 함수 호출
  // Then 저장 실패를 `{ ok: false, error: "STORAGE_FULL" }`로 반환하고
  //      예외를 상위로 던지지 않음
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-2a: setRecords returns {ok:false,error:'STORAGE_FULL'} on QuotaExceededError", () => {
    // Arrange: Mock localStorage.setItem to throw QuotaExceededError
    // (jsdom's Storage is a legacy platform object — direct assignment to
    // `localStorage.setItem` is swallowed as a named-property set rather than
    // overriding the method, so the prototype must be spied on instead.)
    const error = new DOMException("QuotaExceededError", "QuotaExceededError");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw error;
    });

    // Act
    const result = setRecords({});

    // Assert: Should return error object
    expect(result).toEqual({ ok: false, error: "STORAGE_FULL" });

    // Cleanup
    spy.mockRestore();
  });

  it("AC-2b: setRecords does not throw on QuotaExceededError", () => {
    // Arrange
    const error = new DOMException("QuotaExceededError", "QuotaExceededError");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw error;
    });

    // Act & Assert: Should not throw
    expect(() => setRecords({})).not.toThrow();

    // Cleanup
    spy.mockRestore();
  });


  // ──────────────────────────────────────────────────────────────────────────
  // AC-3: 기록 저장 (F1-AC4)
  // When `saveRecord({ id: "2026-07-29", bedTime: "23:30", wakeTime: "06:30" })`
  //      호출
  // Then `sdt.records.v1["2026-07-29"]`에 계산 필드 포함 저장되고
  //      `createdAt`/`updatedAt` 세팅
  //
  // 추가 시나리오: 동일 id 재저장 시 덮어쓰기 (updatedAt 변경, createdAt 유지)
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-3a: saveRecord stores record with computed sleepMinutes and debtMinutes", () => {
    // Arrange
    const input = { id: "2026-07-29", bedTime: "23:30", wakeTime: "06:30" };
    const targetMinutes = 480;

    // Act
    saveRecord(input, targetMinutes);

    // Assert: Check stored record in localStorage
    const stored = JSON.parse(localStorage.getItem("sdt.records.v1") ?? "{}");
    const record = stored["2026-07-29"] as SleepRecord;

    expect(record).toBeDefined();
    expect(record.id).toBe("2026-07-29");
    expect(record.bedTime).toBe("23:30");
    expect(record.wakeTime).toBe("06:30");
    // 23:30 to 06:30 next day = 7 hours = 420 minutes
    expect(record.sleepMinutes).toBe(420);
    // debtMinutes = targetMinutes - sleepMinutes = 480 - 420 = 60
    expect(record.debtMinutes).toBe(60);
  });


  it("AC-3c: saveRecord overwrites existing record with same id, preserving createdAt", async () => {
    // Arrange
    const firstInput = { id: "2026-07-29", bedTime: "23:30", wakeTime: "06:30" };
    saveRecord(firstInput, 480);

    const firstRecord = getRecords()["2026-07-29"] as SleepRecord;
    const firstCreatedAt = firstRecord.createdAt;
    const firstUpdatedAt = firstRecord.updatedAt;

    // Small delay to ensure timestamps differ
    await new Promise((r) => setTimeout(r, 10));

    // Act: Save same id with different times
    const secondInput = { id: "2026-07-29", bedTime: "22:00", wakeTime: "06:00" };
    saveRecord(secondInput, 480);

    // Assert
    const secondRecord = getRecords()["2026-07-29"] as SleepRecord;

    // createdAt should NOT change (preserved from first save)
    expect(secondRecord.createdAt).toBe(firstCreatedAt);

    // updatedAt SHOULD change (new timestamp)
    expect(secondRecord.updatedAt).toBeGreaterThanOrEqual(firstUpdatedAt);

    // Values should be updated
    expect(secondRecord.bedTime).toBe("22:00");
    expect(secondRecord.wakeTime).toBe("06:00");

    // Make sure only one record exists for this date
    const allRecords = getRecords();
    const count = Object.keys(allRecords).filter((k) => k === "2026-07-29").length;
    expect(count).toBe(1);
  });


  // ──────────────────────────────────────────────────────────────────────────
  // AC-4: 연속 기록 스트릭 (F6-AC6)
  // Given 스트릭 키가 저장되지 않음
  // When `getStreak()` 호출
  // Then 기본값 `{currentStreak:0, longestStreak:0, lastCheckInDate:null}` 반환
  // ──────────────────────────────────────────────────────────────────────────

  it("AC-4a: getStreak returns default when key is missing", () => {
    // Arrange: streak key not set

    // Act
    const result = getStreak();

    // Assert
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastCheckInDate: null,
    });

    // Verify type structure
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastCheckInDate).toBeNull();
  });

});
