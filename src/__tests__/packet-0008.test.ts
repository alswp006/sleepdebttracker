import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { mockRouter } from "@/__tests__/__helpers__/mocks-router";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";
import type { SleepRecord } from "@/lib/types";
import type { RewardUnlockState } from "@/lib/storage";
import { getWeekKey } from "@/lib/sleepEngine";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/pages/ReportPage.tsx (주간 리포트 페이지 /report, 리워드 게이트) — the
// file does not exist yet, so every test below WILL fail until the Coder
// implements it.
//
// Contract (from .ai-factory/spec.md F4):
// - Gate button "주간 리포트 보기" shown when sdt.rewardUnlock.v1.report !==
//   getWeekKey(today). Ad watch success -> detail shown + report=weekKey saved.
// - If rewardUnlock.report === getWeekKey(today) -> detail shown immediately,
//   no ad gate.
// - Detail contains data-testid="weekly-bars" (chart) + data-testid="weekly-summary"
//   Card (총부채·평균수면, t2 강조).
// - 0 records this week -> "이번 주 기록이 없어요" empty state, ad button hidden.
// - Ad load/show failure -> Toast "광고를 불러오지 못했어요. 잠시 후 다시
//   시도해주세요", report stays unset (unlock not granted).
// - While aggregating -> Skeleton in chart area.
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

const { default: ReportPage } = await import("@/pages/ReportPage");
const { loadFullScreenAd, showFullScreenAd } = await import(
  "@apps-in-toss/web-framework"
);

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const THIS_WEEK_KEY = getWeekKey(todayISO());

const TODAY_RECORD: SleepRecord = {
  id: todayISO(),
  bedTime: "23:00",
  wakeTime: "06:00",
  sleepMinutes: 420,
  debtMinutes: 60,
  createdAt: 1000,
  updatedAt: 1000,
};

function seedThisWeekRecord() {
  seedLocalStorage({ [SDT_KEYS.records]: { [TODAY_RECORD.id]: TODAY_RECORD } });
}

function seedRewardUnlock(state: RewardUnlockState) {
  seedLocalStorage({ [SDT_KEYS.rewardUnlock]: state });
}

function renderReport() {
  return render(React.createElement(MemoryRouter, null, React.createElement(ReportPage)));
}

describe("주간 리포트 페이지 /report (리워드 게이트) (packet-0008)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // F4-AC1[P0]: 리워드 게이트 — 시청 완료 시 해제 + 저장
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: 미해제 주에서 '주간 리포트 보기' 탭 후 광고 시청 완료 시 상세를 표시하고 rewardUnlock.report에 이번 주 키를 저장한다", async () => {
    seedThisWeekRecord();
    seedRewardUnlock({ report: null, plan: null });
    renderReport();

    const gateButton = await screen.findByRole("button", { name: "주간 리포트 보기" });
    fireEvent.click(gateButton);

    await waitFor(() => {
      expect(screen.getByTestId("weekly-bars")).toBeInTheDocument();
    });
    expect(screen.getByTestId("weekly-summary")).toBeInTheDocument();

    const stored = JSON.parse(
      localStorage.getItem(SDT_KEYS.rewardUnlock) ?? "{}",
    ) as RewardUnlockState;
    expect(stored.report).toBe(THIS_WEEK_KEY);
    expect(showFullScreenAd).toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F4-AC2[P0]: 같은 주 재열람 — 광고 없이 즉시 표시
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: rewardUnlock.report가 이번 주 키와 일치하면 광고 없이 상세를 즉시 표시한다", async () => {
    seedThisWeekRecord();
    seedRewardUnlock({ report: THIS_WEEK_KEY, plan: null });
    renderReport();

    await waitFor(() => {
      expect(screen.getByTestId("weekly-bars")).toBeInTheDocument();
    });
    expect(screen.getByTestId("weekly-summary")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "주간 리포트 보기" })).toBeNull();
    expect(loadFullScreenAd).not.toHaveBeenCalled();
    expect(showFullScreenAd).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F4-AC3[P0]: 리포트 레이아웃 계약
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P0]: 리포트 상세는 weekly-bars 1개 + weekly-summary Card(총부채·평균수면 t2 강조) 1개를 포함한다", async () => {
    seedThisWeekRecord();
    seedRewardUnlock({ report: THIS_WEEK_KEY, plan: null });
    renderReport();

    await waitFor(() => {
      expect(screen.getAllByTestId("weekly-bars")).toHaveLength(1);
    });
    expect(screen.getAllByTestId("weekly-summary")).toHaveLength(1);

    const summary = screen.getByTestId("weekly-summary");
    expect(summary.querySelectorAll('[data-typography="t2"]').length).toBeGreaterThanOrEqual(2);
    expect(summary.textContent).toContain("1h 0m"); // 총부채 60분
    expect(summary.textContent).toContain("7h 0m"); // 평균수면 420분
  });

  // ──────────────────────────────────────────────────────────────────────
  // F4-AC4[P1]: 데이터 부족 — 빈 상태 + 광고 버튼 숨김
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4[P1]: 이번 주 기록이 0건이면 빈 상태를 표시하고 광고 버튼을 숨긴다", async () => {
    seedLocalStorage({ [SDT_KEYS.records]: {} });
    seedRewardUnlock({ report: null, plan: null });
    const { container } = renderReport();

    await waitFor(() => {
      expect(container.querySelector("[data-content-icon]")).not.toBeNull();
    });
    expect(screen.getByText("이번 주 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "주간 리포트 보기" })).toBeNull();
    expect(screen.queryByTestId("weekly-bars")).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F4-AC5[P1]: 광고 로드/시청 실패 — Toast + 미해제 유지
  // ──────────────────────────────────────────────────────────────────────

  it("AC-5[P1]: 광고 시청이 실패하면 Toast를 표시하고 리포트를 미해제 상태로 유지한다", async () => {
    vi.mocked(showFullScreenAd).mockImplementationOnce(((opts: {
      onError?: (e: unknown) => void;
    }) => {
      setTimeout(() => opts.onError?.(new Error("ad-failed")), 0);
    }) as unknown as typeof showFullScreenAd);

    seedThisWeekRecord();
    seedRewardUnlock({ report: null, plan: null });
    renderReport();

    const gateButton = await screen.findByRole("button", { name: "주간 리포트 보기" });
    fireEvent.click(gateButton);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요",
      );
    });
    expect(screen.queryByTestId("weekly-bars")).toBeNull();

    const stored = JSON.parse(
      localStorage.getItem(SDT_KEYS.rewardUnlock) ?? "{}",
    ) as RewardUnlockState;
    expect(stored.report).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F4-AC6[P1]: 로딩 상태 — 차트 영역 Skeleton
  // ──────────────────────────────────────────────────────────────────────

  it("AC-6[P1]: 주간 데이터 집계 중에는 차트 영역에 Skeleton을 표시한다", async () => {
    seedThisWeekRecord();
    seedRewardUnlock({ report: THIS_WEEK_KEY, plan: null });
    const { container } = renderReport();

    // 마운트 직후(집계 완료 전) — 동기적으로 로딩 표시가 보여야 한다
    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByTestId("weekly-bars")).toBeInTheDocument();
    });
    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
  });
});
