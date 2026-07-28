import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  mockTds,
  mockAppsInToss,
  mockRouter,
  mockNavigate,
  mockLocation,
} from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/pages/InputPage.tsx (일일 수면 입력 페이지 /input) — the file does not
// exist yet, so every test below WILL fail until the Coder implements it.
//
// Contract (from packet spec):
// - Fields: date (label /날짜/, native input type=date), 취침 시간 (label
//   "취침 시간", type=time), 기상 시간 (label "기상 시간", type=time).
// - Submit button: SubmitFooter with label "기록 저장" (CLAUDE.md copy rule
//   example verb for this exact save action).
// - location.state (RouteState['/input']) prefills the date field when given
//   ({ date: "YYYY-MM-DD" }); when absent, date defaults to a valid ISO date.
// - Records keyed by date (id === date) in localStorage `sdt.records.v1`, so
//   re-submitting the same date overwrites in place (no duplicate entries).
// - Future dates are rejected inline ("미래 날짜는 기록할 수 없어요"), no save.
// - Empty bedTime/wakeTime rejected inline ("취침·기상 시간을 모두 입력해주세요").
// - sleepMinutes < 60 opens an AlertDialog ("...1시간 미만...") and only saves
//   after the user confirms.
// - While saving, the submit button is disabled (loading) to block double-submit.
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

// @ts-expect-error — TDD red phase: src/pages/InputPage.tsx not implemented yet (Coder writes this next)
const { default: InputPage } = await import("@/pages/InputPage");

function futureISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderInput(routeState: { date?: string } | null = null) {
  (mockLocation as { state: unknown }).state = routeState;
  return render(
    React.createElement(MemoryRouter, null, React.createElement(InputPage)),
  );
}

function getRecords(): Record<string, any> {
  const raw = localStorage.getItem(SDT_KEYS.records);
  return raw ? JSON.parse(raw) : {};
}

function fillTimes(bedTime: string, wakeTime: string) {
  const bedInput = screen.getByLabelText(/취침 시간/) as HTMLInputElement;
  const wakeInput = screen.getByLabelText(/기상 시간/) as HTMLInputElement;
  fireEvent.change(bedInput, { target: { value: bedTime } });
  fireEvent.change(wakeInput, { target: { value: wakeTime } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "기록 저장" }));
}

describe("일일 수면 입력 페이지 /input (packet-0006)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // F2-AC1[P0]: 정상 제출 성공
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1a[P0]: 정상 제출 시 sdt.records.v1에 저장하고 Toast를 보여준 뒤 홈으로 이동한다", async () => {
    renderInput({ date: "2024-01-15" });
    fillTimes("23:30", "06:30");
    submit();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { toast: "기록이 저장됐어요" },
      });
    });

    const records = getRecords();
    expect(records["2024-01-15"].bedTime).toBe("23:30");
    expect(records["2024-01-15"].wakeTime).toBe("06:30");
    expect(records["2024-01-15"].sleepMinutes).toBe(420);
    expect(records["2024-01-15"].id).toBe("2024-01-15");

    expect(screen.getByRole("status")).toHaveTextContent("기록을 저장했어요");
  });

  it("AC-1b[P0]: location.state의 date로 RouteState를 캐스팅해 날짜 입력 기본값을 채운다", () => {
    renderInput({ date: "2024-03-10" });
    const dateInput = screen.getByLabelText(/날짜/) as HTMLInputElement;
    expect(dateInput.value).toBe("2024-03-10");

    // state 없이 진입해도 유효한 ISO 날짜 기본값이 채워진다 (오늘 날짜 등)
    renderInput(null);
    const dateInputs = screen.getAllByLabelText(/날짜/) as HTMLInputElement[];
    expect(dateInputs[dateInputs.length - 1].value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // ──────────────────────────────────────────────────────────────────────
  // F2-AC2/AC3[P0]: 덮어쓰기 + 미래 날짜 거부
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2a[P0]: 동일 날짜 재제출 시 기존 기록을 덮어쓰고 중복 항목을 만들지 않는다", async () => {
    seedLocalStorage({
      [SDT_KEYS.records]: {
        "2024-05-01": {
          id: "2024-05-01",
          bedTime: "22:00",
          wakeTime: "05:00",
          sleepMinutes: 420,
          debtMinutes: 60,
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    });

    renderInput({ date: "2024-05-01" });
    fillTimes("23:00", "06:00");
    submit();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { toast: "기록이 저장됐어요" },
      });
    });

    const records = getRecords();
    expect(Object.keys(records)).toHaveLength(1);
    expect(records["2024-05-01"].bedTime).toBe("23:00");
    expect(records["2024-05-01"].wakeTime).toBe("06:00");
    expect(records["2024-05-01"].createdAt).toBe(1000);
  });

  it("AC-2b[P0]: 미래 날짜 제출 시 '미래 날짜는 기록할 수 없어요' 에러를 표시하고 저장하지 않는다", async () => {
    renderInput(null);
    const dateInput = screen.getByLabelText(/날짜/) as HTMLInputElement;
    const future = futureISO(30);
    fireEvent.change(dateInput, { target: { value: future } });
    fillTimes("23:00", "06:00");
    submit();

    await waitFor(() => {
      expect(screen.getByText("미래 날짜는 기록할 수 없어요")).toBeInTheDocument();
    });

    const records = getRecords();
    expect(records[future]).toBeUndefined();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F2-AC4/AC5[P1]: 빈 시간 거부 + 1시간 미만 확인 다이얼로그
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3a[P1]: 취침·기상 시간이 비어 있으면 인라인 에러를 표시하고 저장하지 않는다", async () => {
    renderInput({ date: "2024-06-01" });
    const bedInput = screen.getByLabelText(/취침 시간/) as HTMLInputElement;
    const wakeInput = screen.getByLabelText(/기상 시간/) as HTMLInputElement;
    fireEvent.change(bedInput, { target: { value: "" } });
    fireEvent.change(wakeInput, { target: { value: "06:00" } });
    submit();

    await waitFor(() => {
      expect(
        screen.getByText("취침·기상 시간을 모두 입력해주세요"),
      ).toBeInTheDocument();
    });

    const records = getRecords();
    expect(records["2024-06-01"]).toBeUndefined();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-3b[P1]: 수면 시간이 1시간 미만이면 AlertDialog 확인 후에만 저장된다", async () => {
    renderInput({ date: "2024-07-01" });
    fillTimes("06:00", "06:30"); // 30분 수면
    submit();

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("1시간 미만");

    // 확인 전에는 저장되지 않는다
    expect(getRecords()["2024-07-01"]).toBeUndefined();

    const confirmButton = within(dialog)
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label") !== "닫기");
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { toast: "기록이 저장됐어요" },
      });
    });

    const records = getRecords();
    expect(records["2024-07-01"].bedTime).toBe("06:00");
    expect(records["2024-07-01"].wakeTime).toBe("06:30");
    expect(records["2024-07-01"].sleepMinutes).toBe(30);
  });

  // ──────────────────────────────────────────────────────────────────────
  // F2-AC6/AC7[P1]: 저장 중 중복 제출 차단 + SubmitFooter 골격
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4a[P1]: 제출 클릭 시 버튼이 loading/disabled 상태가 되어 중복 제출을 막는다", () => {
    renderInput({ date: "2024-08-01" });
    fillTimes("23:00", "07:00"); // 480분, 정상 수면(다이얼로그 없음)

    const button = screen.getByRole("button", { name: "기록 저장" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(button).toBeDisabled();
  });

  it("AC-4b[P1]: 1차 CTA는 SubmitFooter(FixedBottomCTA) 하나로 렌더되며 버튼 중첩이 없다", () => {
    const { container } = renderInput({ date: "2024-08-01" });

    // FixedBottomCTA 자체가 <button>이므로 그 안에 또 다른 <button>을 넣으면 안 된다.
    expect(container.querySelectorAll("button button")).toHaveLength(0);
    expect(
      container.querySelector('[data-slot="fixed-bottom-cta"]'),
    ).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "기록 저장" })).toHaveLength(1);
  });
});
