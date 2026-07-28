import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/pages/DiagnosisPage.tsx (수면 유형 진단 페이지 /diagnosis) — the file
// does not exist yet, so every test below WILL fail until the Coder
// implements it.
//
// Contract (from .ai-factory/spec.md F7 — question copy/scoring table is
// explicitly undecided upstream ("브리핑에 미정"), so this test file fixes
// the concrete implementation contract the Coder MUST follow):
//
// - DiagnosisPage.tsx has a DEFAULT export (the page component) AND a NAMED
//   export `classifyChronotype(score: number): 'MORNING' | 'INTERMEDIATE' | 'EVENING'`
//   implementing exactly: score>=67 -> MORNING, 34~66 -> INTERMEDIATE, <=33 -> EVENING.
// - All 5 questions render simultaneously (no pagination). Each question i
//   (1-indexed, 1..5) offers exactly two selectable options:
//     - data-testid={`diagnosis-q${i}-morning`} — contributes 20 points
//     - data-testid={`diagnosis-q${i}-evening`} — contributes 0 points
//   Selecting one clears the other for that question. Sum across 5 questions
//   yields score in [0, 100], matching the classifyChronotype thresholds above.
// - A "결과 보기" button (role=button) submits. If <5 questions answered ->
//   error text "모든 문항에 답해주세요" shown, no result rendered, no navigate.
// - On full submit: saves ChronotypeResult { type, score, answeredAt } to
//   localStorage key sdt.chronotype.v1 (SDT_KEYS.chronotype), and switches
//   in-place to a result view showing `data-testid="chronotype-result"` Card
//   with the type badge (아침형/중간형/저녁형 text) + a feature description.
//   This is a tab-internal view swap — react-router `navigate` is NEVER called.
// - Progress: while answering (not yet all 5), a "N / 5" text is shown
//   somewhere in the document reflecting how many questions have an answer.
// - On mount, if sdt.chronotype.v1 already holds a result, show a summary of
//   it (still via the `chronotype-result` Card testid) + a "다시 검사하기"
//   button, WITHOUT showing the question form. Clicking "다시 검사하기"
//   clears the stored answers/result and shows a fresh, fully-unanswered
//   question form.
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

const DIAGNOSIS_PAGE_MODULE = "@/pages/DiagnosisPage";
const { default: DiagnosisPage, classifyChronotype } = await import(
  /* @vite-ignore */ DIAGNOSIS_PAGE_MODULE
);

function renderDiagnosis() {
  return render(React.createElement(MemoryRouter, null, React.createElement(DiagnosisPage)));
}

function answer(n: number, choice: "morning" | "evening") {
  const el = screen.getByTestId(`diagnosis-q${n}-${choice}`);
  el.click();
}

function answerAll(choices: Array<"morning" | "evening">) {
  choices.forEach((choice, idx) => answer(idx + 1, choice));
}

function getSavedChronotype(): { type: string; score: number; answeredAt: number } | null {
  const raw = localStorage.getItem(SDT_KEYS.chronotype);
  return raw ? JSON.parse(raw) : null;
}

describe("수면 유형 진단 페이지 /diagnosis (packet-0010)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // F7-AC1[P0]: 판정 로직 (score threshold) + 저장
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: classifyChronotype는 score 경계값에서 MORNING/INTERMEDIATE/EVENING을 정확히 판정한다", () => {
    expect(classifyChronotype(0)).toBe("EVENING");
    expect(classifyChronotype(33)).toBe("EVENING");
    expect(classifyChronotype(34)).toBe("INTERMEDIATE");
    expect(classifyChronotype(50)).toBe("INTERMEDIATE");
    expect(classifyChronotype(66)).toBe("INTERMEDIATE");
    expect(classifyChronotype(67)).toBe("MORNING");
    expect(classifyChronotype(100)).toBe("MORNING");
  });

  it("AC-1[P0]: 5문항 모두 아침형으로 응답 후 제출하면 sdt.chronotype.v1에 type=MORNING, score=100, answeredAt이 저장된다", () => {
    renderDiagnosis();
    answerAll(["morning", "morning", "morning", "morning", "morning"]);
    screen.getByRole("button", { name: /결과 보기/ }).click();

    const saved = getSavedChronotype();
    expect(saved).not.toBeNull();
    expect(saved!.type).toBe("MORNING");
    expect(saved!.score).toBe(100);
    expect(typeof saved!.answeredAt).toBe("number");
    expect(saved!.answeredAt).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────
  // F7-AC2[P0]: 진단 완료 — 결과 카드 표시, navigate 없이 뷰 전환
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: 전 문항 응답(3 아침형 + 2 저녁형=score 60) 후 '결과 보기' 탭 시 chronotype-result Card에 중간형 배지+특징 문구가 표시된다", () => {
    renderDiagnosis();
    answerAll(["morning", "morning", "morning", "evening", "evening"]);
    screen.getByRole("button", { name: /결과 보기/ }).click();

    const card = screen.getByTestId("chronotype-result");
    expect(within(card).getByText(/중간형/)).toBeInTheDocument();
    // 배지 텍스트 이상의 특징 문구(설명)가 함께 렌더되어야 한다.
    expect(card.textContent!.length).toBeGreaterThan("중간형".length + 5);
  });

  it("AC-2[P0]: 결과 제출은 navigate를 호출하지 않고(탭 내 뷰 전환) 문항 제출 버튼을 결과 화면으로 대체한다", () => {
    renderDiagnosis();
    answerAll(["evening", "evening", "evening", "evening", "evening"]);
    screen.getByRole("button", { name: /결과 보기/ }).click();

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /결과 보기/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("chronotype-result")).toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F7-AC3[P1]: 미완료 제출 차단
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P1]: 5문항 중 2문항만 응답 후 '결과 보기' 탭 시 '모든 문항에 답해주세요' 에러가 표시되고 결과는 노출되지 않는다", () => {
    renderDiagnosis();
    answer(1, "morning");
    answer(2, "evening");
    screen.getByRole("button", { name: /결과 보기/ }).click();

    expect(screen.getByText(/모든 문항에 답해주세요/)).toBeInTheDocument();
    expect(screen.queryByTestId("chronotype-result")).not.toBeInTheDocument();
    expect(getSavedChronotype()).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F7-AC4[P1]: 기존 결과 재노출
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4[P1]: sdt.chronotype.v1에 기존 결과가 있으면 진입 시 이전 결과 요약 + '다시 검사하기' 버튼을 표시하고 문항 폼은 숨긴다", () => {
    seedLocalStorage({
      [SDT_KEYS.chronotype]: { type: "EVENING", score: 20, answeredAt: 1700000000000 },
    });
    renderDiagnosis();

    const card = screen.getByTestId("chronotype-result");
    expect(within(card).getByText(/저녁형/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 검사하기/ })).toBeInTheDocument();
    expect(screen.queryByTestId("diagnosis-q1-morning")).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // F7-AC5[P1]: 재검사 — 문항 초기화, 이전 응답 미잔존
  // ──────────────────────────────────────────────────────────────────────

  it("AC-5[P1]: '다시 검사하기' 탭 시 문항이 초기화되고, 새로 응답한 값만으로 다음 제출 결과가 계산된다(이전 응답 미잔존)", () => {
    renderDiagnosis();
    // 1차: 전부 저녁형(score 0) 응답 후 제출
    answerAll(["evening", "evening", "evening", "evening", "evening"]);
    screen.getByRole("button", { name: /결과 보기/ }).click();
    expect(getSavedChronotype()!.score).toBe(0);

    // 재검사
    screen.getByRole("button", { name: /다시 검사하기/ }).click();
    expect(screen.queryByTestId("chronotype-result")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /결과 보기/ })).toBeInTheDocument();

    // 2차: 전부 아침형(score 100)으로 새로 응답 후 제출 — 이전 응답이 남아있다면
    // 혼합되어 100이 아닌 값이 저장될 것이다.
    answerAll(["morning", "morning", "morning", "morning", "morning"]);
    screen.getByRole("button", { name: /결과 보기/ }).click();

    const saved = getSavedChronotype();
    expect(saved!.score).toBe(100);
    expect(saved!.type).toBe("MORNING");
  });

  // ──────────────────────────────────────────────────────────────────────
  // F7-AC6[P1]: 진행 표시
  // ──────────────────────────────────────────────────────────────────────

  it("AC-6[P1]: 문항 응답 중일 때 상단에 '3 / 5' 진행 표기가 나타난다", () => {
    renderDiagnosis();
    answer(1, "morning");
    answer(2, "evening");
    answer(3, "morning");

    expect(screen.getByText(/3\s*\/\s*5/)).toBeInTheDocument();
  });
});
