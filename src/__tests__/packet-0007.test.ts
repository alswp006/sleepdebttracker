import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
import type { SleepRecord, StreakState } from "@/lib/types";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/pages/HomePage.tsx (홈 대시보드 / + 배너 광고) — the file does not exist
// yet, so every test below WILL fail until the Coder implements it.
//
// Contract (from .ai-factory/spec.md F3 + F6-AC5):
// - data-testid="debt-hero" SummaryHero: CountUp 누적 부채 "5h 0m" (300분 기준)
// - data-testid="payoff-card" Card: "약 10일 후 상환 완료" (totalDebt=300, rate=30/일)
// - Layout contract: debt-hero 1개 + data-testid="debt-sparkline" Sparkline 1개
//   + payoff-card 1개, 핵심 값은 t2~t3 타이포 강조
// - 오늘 미기록 시: "오늘 수면을 기록해보세요" + display="block" 버튼 "오늘 기록하기"
//   → navigate("/input", { state: { date: todayISO } })
// - records 0건: Asset.ContentIcon 빈 상태 + 차트/카드 숨김
// - 로딩 중: Skeleton + 부채 값 자리에 "—"
// - 최하단 <AdSlot> 1개, 부채 히어로/카드와 겹치지 않음 (DOM 순서상 이후)
// - data-testid="streak-badge" Chip: "🔥 4일 연속" (0일이면 "기록을 시작해보세요")
// - location.state.toast가 있으면 Toast 표시
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

// @ts-expect-error — TDD red phase: src/pages/HomePage.tsx not implemented yet (Coder writes this next)
const { default: HomePage } = await import("@/pages/HomePage");

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderHome(routeState: { toast?: string } | null = null) {
  (mockLocation as { state: unknown }).state = routeState;
  return render(React.createElement(MemoryRouter, null, React.createElement(HomePage)));
}

const PAST_RECORD: SleepRecord = {
  id: "2026-07-20",
  bedTime: "23:00",
  wakeTime: "05:00",
  sleepMinutes: 360,
  debtMinutes: 300,
  createdAt: 1000,
  updatedAt: 1000,
};

function seedPastDebtRecord() {
  seedLocalStorage({ [SDT_KEYS.records]: { [PAST_RECORD.id]: PAST_RECORD } });
}

describe("홈 대시보드 / (+ 배너 광고) (packet-0007)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // F3-AC1/AC2[P0]: 누적 부채 히어로 + 상환 예상일 카드
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: debt-hero에 누적 부채 '5h 0m', payoff-card에 '약 10일 후 상환 완료'를 표기한다", async () => {
    seedPastDebtRecord();
    renderHome();

    await waitFor(() => {
      expect(screen.getByTestId("debt-hero").textContent).toContain("5h 0m");
    });
    expect(screen.getByTestId("payoff-card").textContent).toContain(
      "약 10일 후 상환 완료",
    );
  });

  it("AC-1b[P0]: records가 없으면(빈 상태) debt-hero/payoff-card 대신 빈 상태를 표기한다", async () => {
    seedLocalStorage({ [SDT_KEYS.records]: {} });
    const { container } = renderHome();

    await waitFor(() => {
      expect(container.querySelector("[data-content-icon]")).not.toBeNull();
    });
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
    expect(screen.queryByTestId("debt-hero")).toBeNull();
    expect(screen.queryByTestId("debt-sparkline")).toBeNull();
    expect(screen.queryByTestId("payoff-card")).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F3-AC3[P0]: 홈 레이아웃 계약 (개수 + 타이포)
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: 레이아웃 계약 — debt-hero 1개, debt-sparkline 1개, payoff-card 1개, 핵심 값은 t2~t3 강조", async () => {
    seedPastDebtRecord();
    renderHome();

    await waitFor(() => {
      expect(screen.getAllByTestId("debt-hero")).toHaveLength(1);
    });
    expect(screen.getAllByTestId("debt-sparkline")).toHaveLength(1);
    expect(screen.getAllByTestId("payoff-card")).toHaveLength(1);

    const hero = screen.getByTestId("debt-hero");
    const payoffCard = screen.getByTestId("payoff-card");
    expect(
      hero.querySelector('[data-typography="t2"], [data-typography="t3"]'),
    ).not.toBeNull();
    expect(
      payoffCard.querySelector('[data-typography="t2"], [data-typography="t3"]'),
    ).not.toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F3-AC4[P1]: 오늘 미기록 안내 + /input 이동
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P1]: 오늘 기록이 없으면 안내 문구와 버튼을 표시하고, 클릭 시 오늘 날짜로 /input 이동한다", async () => {
    seedPastDebtRecord(); // 과거 날짜 기록만 존재 — 오늘 기록 없음
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("오늘 수면을 기록해보세요")).toBeInTheDocument();
    });

    const cta = screen.getByRole("button", { name: "오늘 기록하기" });
    fireEvent.click(cta);

    expect(mockNavigate).toHaveBeenCalledWith("/input", {
      state: { date: todayISO() },
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // F3-AC6[P1]: 로딩 상태
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4[P1]: 로딩 중에는 Skeleton과 '—' 자리표시자를 보여주고, 로드 완료 후 실제 값으로 교체한다", async () => {
    seedPastDebtRecord();
    const { container } = renderHome();

    // 마운트 직후(로드 완료 전) — 동기적으로 로딩 표시가 보여야 한다
    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
    expect(screen.getByText("—")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("debt-hero").textContent).toContain("5h 0m");
    });
    expect(container.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // F3-AC7[P2]: 배너 광고 최하단 배치
  // ──────────────────────────────────────────────────────────────────────

  it("AC-5[P2]: 콘텐츠 최하단에 AdSlot 1개를 배치하고 부채 히어로와 겹치지 않는다", async () => {
    seedPastDebtRecord();
    const { container } = renderHome();

    await waitFor(() => {
      expect(screen.getByTestId("debt-hero")).toBeInTheDocument();
    });

    const adSlots = container.querySelectorAll(".ad-slot");
    expect(adSlots).toHaveLength(1);

    const hero = screen.getByTestId("debt-hero");
    const adSlot = adSlots[0];
    // eslint-disable-next-line no-bitwise
    expect(
      hero.compareDocumentPosition(adSlot) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F6-AC5[P1]: 스트릭 배지
  // ──────────────────────────────────────────────────────────────────────

  it("AC-6[P1]: 스트릭 배지는 현재 연속일을 표기하고, 0일이면 '기록을 시작해보세요'를 표기한다", async () => {
    seedPastDebtRecord();
    const streak: StreakState = {
      currentStreak: 4,
      longestStreak: 5,
      lastRecordDate: "2026-07-28",
      updatedAt: 2000,
    };
    seedLocalStorage({ [SDT_KEYS.streak]: streak });
    const first = renderHome();

    await waitFor(() => {
      expect(screen.getByText("🔥 4일 연속")).toBeInTheDocument();
    });
    first.unmount();

    // 스트릭 키 없음(0일) — 안전 초기화된 문구로 폴백
    seedPastDebtRecord();
    renderHome();

    await waitFor(() => {
      expect(screen.getByText("기록을 시작해보세요")).toBeInTheDocument();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // toast: location.state.toast 표시
  // ──────────────────────────────────────────────────────────────────────

  it("AC-7[P1]: location.state.toast가 있으면 Toast로 표시한다", async () => {
    seedPastDebtRecord();
    renderHome({ toast: "기록이 저장됐어요" });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("기록이 저장됐어요");
    });
  });
});
