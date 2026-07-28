import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// NOTE: react-router-dom은 일부러 mock하지 않는다(packet-0011과 동일한 이유 —
// mockRouter()는 useLocation을 고정값으로 대체해 App 통합 테스트에서 실제 라우트
// 매칭이 깨진다). TDS/SDK/storage만 mock하고 MemoryRouter + 실제
// react-router-dom으로 통합 동작을 검증한다.
mockTds();
mockAppsInToss();
mockTossRewardAd();

const mockGetSettings = vi.fn();
const mockSetSettings = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getSettings: mockGetSettings,
    setSettings: mockSetSettings,
  };
});

const FIXED_NOW = 1690000000000;

// src/components/OnboardingNotice.tsx는 아직 없다(TDD red phase) — 리터럴 문자열 대신
// 변수 + /* @vite-ignore */로 동적 import해 tsc의 정적 모듈 해석(TS2307)을 피한다.
const ONBOARDING_NOTICE_MODULE = "@/components/OnboardingNotice";
async function importOnboardingNotice() {
  const mod = await import(/* @vite-ignore */ ONBOARDING_NOTICE_MODULE);
  return mod.default as React.ComponentType;
}

// AI 냄새 금지 카피 규칙(CLAUDE.md) 위반 표현
const BANNED_COPY_PATTERNS = [/환영합니다/, /당신/, /완벽/, /놀라운/, /멋진/, /해보세요!/];

// 소스 전체 컴플라이언스 스캔 대상 디렉터리
function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectSourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("AI 미사용 고지 · 검수 컴플라이언스 폴리시", () => {
  beforeEach(() => {
    mockGetSettings.mockReset();
    mockSetSettings.mockReset();
  });

  // ──────────────────────────────────────────────────────────────────
  // AC-1[P0]: 첫 진입 시 안내 다이얼로그 1회 표시 후 onboardedAt 저장
  // ──────────────────────────────────────────────────────────────────

  it("AC-1[P0]: onboardedAt=null이면 첫 진입 시 안내 AlertDialog가 표시된다", async () => {
    mockGetSettings.mockReturnValue(null);
    const OnboardingNotice = await importOnboardingNotice();

    renderWithRouter(React.createElement(OnboardingNotice));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(mockSetSettings).not.toHaveBeenCalled();
  });

  it("AC-1[P0]: onboardedAt이 이미 저장되어 있으면 재진입 시 다이얼로그가 표시되지 않는다", async () => {
    mockGetSettings.mockReturnValue({
      targetSleepMinutes: 480,
      targetBedTime: "23:00",
      targetWakeTime: "07:00",
      notificationEnabled: false,
      darkModeEnabled: false,
      updatedAt: FIXED_NOW,
      onboardedAt: FIXED_NOW,
    });
    const OnboardingNotice = await importOnboardingNotice();

    renderWithRouter(React.createElement(OnboardingNotice));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mockSetSettings).not.toHaveBeenCalled();
  });

  it("AC-1: 확인 버튼 클릭 시 setSettings로 onboardedAt이 저장되고 다이얼로그가 닫힌다", async () => {
    mockGetSettings.mockReturnValue(null);
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW);
    const OnboardingNotice = await importOnboardingNotice();

    renderWithRouter(React.createElement(OnboardingNotice));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(mockSetSettings).toHaveBeenCalledTimes(1);
    const savedArg = mockSetSettings.mock.calls[0][0];
    expect(savedArg.onboardedAt).toBe(FIXED_NOW);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────
  // AC-2[P0]: HEX 색상 하드코딩 · 외부 이탈 · 외부 로깅 없음 최종 확인
  // ──────────────────────────────────────────────────────────────────

  it("AC-2[P0]: src/pages, src/components 전체에 HEX 색상 하드코딩이 없다", () => {
    const dirs = ["../pages", "../components"].map((d) => path.resolve(__dirname, d));
    const files = dirs.flatMap((d) => collectSourceFiles(d));
    expect(files.length).toBeGreaterThan(0);

    const offenders = files.filter((f) => {
      const source = fs.readFileSync(f, "utf-8");
      return /#[0-9a-fA-F]{3,8}\b/.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("AC-2[P0]: src/pages, src/components 전체에 외부 이탈·외부 로깅 호출이 없다", () => {
    const dirs = ["../pages", "../components"].map((d) => path.resolve(__dirname, d));
    const files = dirs.flatMap((d) => collectSourceFiles(d));
    const forbiddenPattern = /window\.open\(|location\.href\s*=|gtag\(|amplitude\.|mixpanel\./;

    const offenders = files.filter((f) => {
      const source = fs.readFileSync(f, "utf-8");
      return forbiddenPattern.test(source);
    });

    expect(offenders).toEqual([]);
  });

  // ──────────────────────────────────────────────────────────────────
  // AC-3: 터치타깃 ≥44px 대응 버튼 요소, 해요체·긍정형, Dialog 좌측 '닫기'
  // ──────────────────────────────────────────────────────────────────

  it("AC-3: 다이얼로그는 좌측 '닫기' 버튼과 실제 <button> 확인 액션을 함께 렌더한다", async () => {
    mockGetSettings.mockReturnValue(null);
    const OnboardingNotice = await importOnboardingNotice();

    const { container } = renderWithRouter(React.createElement(OnboardingNotice));

    const closeButton = screen.getByRole("button", { name: "닫기" });
    const confirmButton = screen.getByRole("button", { name: "확인" });
    expect(closeButton.tagName).toBe("BUTTON");
    expect(confirmButton.tagName).toBe("BUTTON");

    const buttons: HTMLElement[] = Array.from(container.querySelectorAll("button"));
    expect(buttons.indexOf(closeButton)).toBeLessThan(buttons.indexOf(confirmButton));
  });

  it("AC-3: 안내 문구는 느낌표 1개 이하이며 금지 표현을 포함하지 않는다", async () => {
    mockGetSettings.mockReturnValue(null);
    const OnboardingNotice = await importOnboardingNotice();

    renderWithRouter(React.createElement(OnboardingNotice));
    const dialogText = screen.getByRole("alertdialog").textContent ?? "";

    const exclamationCount = (dialogText.match(/!/g) ?? []).length;
    expect(exclamationCount).toBeLessThanOrEqual(1);
    for (const pattern of BANNED_COPY_PATTERNS) {
      expect(dialogText).not.toMatch(pattern);
    }
  });

  // ──────────────────────────────────────────────────────────────────
  // AC-4: App.tsx 통합 — 라우트와 무관하게 최초 1회 안내가 뜨고 이후 재발하지 않는다
  // ──────────────────────────────────────────────────────────────────

  it("AC-4: onboardedAt=null이면 어떤 경로에 진입해도 App 최상단에서 안내가 뜨고 페이지도 정상 렌더된다", async () => {
    mockGetSettings.mockReturnValue(null);
    const App = (await import("@/App")).default;

    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/report"],
    });

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    const headings = Array.from(container.querySelectorAll("h1"));
    expect(headings[headings.length - 1]?.textContent?.trim()).toBe("주간 리포트");
  });

  it("AC-4: onboardedAt이 이미 저장된 경우 App을 다시 마운트해도 안내가 재표시되지 않는다", async () => {
    mockGetSettings.mockReturnValue({
      targetSleepMinutes: 480,
      targetBedTime: "23:00",
      targetWakeTime: "07:00",
      notificationEnabled: false,
      darkModeEnabled: false,
      updatedAt: FIXED_NOW,
      onboardedAt: FIXED_NOW,
    });
    const App = (await import("@/App")).default;

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
