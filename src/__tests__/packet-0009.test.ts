import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";
import type { SleepRecord } from "@/lib/types";
import type { RewardUnlockState } from "@/lib/storage";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/pages/PlanPage.tsx (주말 회복 플랜 페이지 /plan, 리워드 게이트) — the
// file does not exist yet, so every test below WILL fail until the Coder
// implements it.
//
// Contract (from .ai-factory/spec.md F5):
// - Gate button "회복 플랜 보기" shown when totalDebt > 0 and plan not unlocked.
//   Ad watch success -> data-testid="plan-card" Card x2 (토·일) shown +
//   rewardUnlock.plan saved (non-null).
// - Each plan-card shows additional sleep minutes (t3 강조) + recommended
//   bedtime/wake-time Badge.
// - totalDebt === 0 -> "수면 부채가 없어요! 잘 자고 있어요" message, ad
//   button + plan cards hidden.
// - Ad load/show failure or incomplete -> detail not shown, Toast "광고 시청
//   후 플랜을 확인할 수 있어요", rewardUnlock.plan stays unset.
// - While computing -> gate button is in loading state (disabled), preventing
//   duplicate ad triggers on repeated clicks.
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

const PLAN_PAGE_MODULE = "@/pages/PlanPage";
const { default: PlanPage } = await import(/* @vite-ignore */ PLAN_PAGE_MODULE);
const { showFullScreenAd } = await import("@apps-in-toss/web-framework");

function makeRecord(id: string, debtMinutes: number): SleepRecord {
  return {
    id,
    bedTime: "23:30",
    wakeTime: "06:00",
    sleepMinutes: 480 - debtMinutes,
    debtMinutes,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function seedDebtRecords(totalDebtMinutes: number) {
  seedLocalStorage({
    [SDT_KEYS.records]: {
      "2026-07-20": makeRecord("2026-07-20", totalDebtMinutes),
    },
  });
}

function seedNoDebtRecords() {
  seedLocalStorage({
    [SDT_KEYS.records]: {
      "2026-07-20": makeRecord("2026-07-20", 0),
    },
  });
}

function seedRewardUnlock(state: RewardUnlockState) {
  seedLocalStorage({ [SDT_KEYS.rewardUnlock]: state });
}

function renderPlan() {
  return render(React.createElement(MemoryRouter, null, React.createElement(PlanPage)));
}

describe("회복 플랜 페이지 /plan (리워드 게이트) (packet-0009)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // F5-AC2[P0]: 리워드 게이트 — 시청 완료 시 카드 2개 표시 + 저장
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: 미해제 상태에서 '회복 플랜 보기' 탭 후 광고 시청 완료 시 plan-card 2개(토·일)를 표시하고 rewardUnlock.plan을 저장한다", async () => {
    seedDebtRecords(300);
    seedRewardUnlock({ report: null, plan: null });
    renderPlan();

    const gateButton = await screen.findByRole("button", { name: "회복 플랜 보기" });
    fireEvent.click(gateButton);

    await waitFor(() => {
      expect(screen.getAllByTestId("plan-card")).toHaveLength(2);
    });
    expect(showFullScreenAd).toHaveBeenCalled();

    const stored = JSON.parse(
      localStorage.getItem(SDT_KEYS.rewardUnlock) ?? "{}",
    ) as RewardUnlockState;
    expect(stored.plan).not.toBeNull();
    expect(typeof stored.plan).toBe("string");
  });

  it("AC-1b[P0]: rewardUnlock.plan이 이미 이번 주 값으로 설정돼 있으면 광고 없이 plan-card를 즉시 표시한다", async () => {
    seedDebtRecords(300);
    // 이전 실행에서 이미 저장된 unlock 값을 그대로 재사용 (재열람 시 광고 재게이팅 금지)
    seedRewardUnlock({ report: null, plan: "unlocked" });
    renderPlan();

    await waitFor(() => {
      expect(screen.getAllByTestId("plan-card")).toHaveLength(2);
    });
    expect(screen.queryByRole("button", { name: "회복 플랜 보기" })).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F5-AC3[P0]: 플랜 레이아웃 계약 — 추가 수면(t3)+배지
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: 각 plan-card는 추가 수면 시간(t3 강조)과 권장 취침/기상 Badge를 포함한다", async () => {
    seedDebtRecords(300);
    seedRewardUnlock({ report: null, plan: "unlocked" });
    renderPlan();

    const cards = await screen.findAllByTestId("plan-card");
    expect(cards).toHaveLength(2);

    for (const card of cards) {
      expect(card.querySelectorAll('[data-typography="t3"]').length).toBeGreaterThanOrEqual(1);
      expect(card.querySelectorAll('[role="status"]').length).toBeGreaterThanOrEqual(1);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // F5-AC4[P1]: 부채 없음 — 빈 상태 + 광고/카드 숨김
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P1]: totalDebt=0이면 '수면 부채가 없어요! 잘 자고 있어요'를 표시하고 광고 버튼과 plan-card를 숨긴다", async () => {
    seedNoDebtRecords();
    seedRewardUnlock({ report: null, plan: null });
    renderPlan();

    await waitFor(() => {
      expect(screen.getByText("수면 부채가 없어요! 잘 자고 있어요")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "회복 플랜 보기" })).toBeNull();
    expect(screen.queryByTestId("plan-card")).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F5-AC5[P1]: 광고 실패/미완료 — Toast + 상세 미표시
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4[P1]: 광고 시청이 실패하면 Toast '광고 시청 후 플랜을 확인할 수 있어요'를 표시하고 plan-card를 노출하지 않는다", async () => {
    vi.mocked(showFullScreenAd).mockImplementationOnce(((opts: {
      onError?: (e: unknown) => void;
    }) => {
      setTimeout(() => opts.onError?.(new Error("ad-failed")), 0);
    }) as unknown as typeof showFullScreenAd);

    seedDebtRecords(300);
    seedRewardUnlock({ report: null, plan: null });
    renderPlan();

    const gateButton = await screen.findByRole("button", { name: "회복 플랜 보기" });
    fireEvent.click(gateButton);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "광고 시청 후 플랜을 확인할 수 있어요",
      );
    });
    expect(screen.queryByTestId("plan-card")).toBeNull();

    const stored = JSON.parse(
      localStorage.getItem(SDT_KEYS.rewardUnlock) ?? "{}",
    ) as RewardUnlockState;
    expect(stored.plan).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F5-AC6[P1]: 계산 중 loading — 중복 실행 차단
  // ──────────────────────────────────────────────────────────────────────

  it("AC-5[P1]: 게이트 버튼 탭 직후 계산 중에는 버튼이 loading(disabled) 상태가 되어 중복 클릭이 광고를 두 번 트리거하지 않는다", async () => {
    seedDebtRecords(300);
    seedRewardUnlock({ report: null, plan: null });
    renderPlan();

    const gateButton = await screen.findByRole("button", { name: "회복 플랜 보기" });
    fireEvent.click(gateButton);
    fireEvent.click(gateButton);
    fireEvent.click(gateButton);

    await waitFor(() => {
      expect(screen.getAllByTestId("plan-card")).toHaveLength(2);
    });
    expect(showFullScreenAd).toHaveBeenCalledTimes(1);
  });
});
