import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import App from "@/App";

// ============================================================================
// TDD tests for packet 공통 ScreenScaffold 확정 및 실패 테스트 그린화(0005).
// Goal: every routed page is wrapped by ScreenScaffold(PageShell), the full
// suite runs with 0 failures/0 skips, and all 5 routes render without any
// console error/warning (validateDOMNesting etc.).
// ============================================================================

mockAll();

const ROUTES = ["/", "/input", "/report", "/plan", "/diagnosis"];
// Top title text unique to each routed page — used to assert the correct
// page actually rendered for its route (not just "some div rendered").
const ROUTE_TITLES: Record<string, string> = {
  "/": "수면 부채",
  "/input": "오늘 수면 기록",
  "/report": "주간 리포트",
  "/plan": "회복 수면 플랜",
  "/diagnosis": "수면 유형 진단",
};

const SRC_DIR = path.resolve(__dirname, "..");
const TESTS_DIR = path.resolve(__dirname, "..", "__tests__");

describe("공통 ScreenScaffold 확정 및 실패 테스트 그린화(0005)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // AC-3[P0]: 콘솔 에러/경고 없이 5개 라우트가 렌더된다
  //
  // NOTE: React의 validateDOMNesting 경고는 (parent tag, child tag) 조합별로
  // 프로세스 생존 기간 동안 한 번만 출력되고 이후엔 억제된다. 이 파일의 다른
  // 테스트가 먼저 라우트를 렌더하면 경고가 이미 소비돼 이 테스트가 거짓 통과할
  // 수 있으므로, 콘솔 검증은 반드시 이 describe에서 가장 먼저 실행돼야 한다.
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P0]: 5개 라우트를 순서대로 렌더해도 console.error가 한 번도 호출되지 않는다", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const route of ROUTES) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });
      unmount();
    }

    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("AC-3: 5개 라우트를 순서대로 렌더해도 console.warn이 한 번도 호출되지 않는다", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    for (const route of ROUTES) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });
      unmount();
    }

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-1[P0]: 모든 페이지가 ScreenScaffold로 감싸지며 raw div 골격이 남아있지 않다
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: 5개 라우트 모두 ScreenScaffold(PageShell, min-height:100dvh 루트)로 렌더된다", () => {
    for (const route of ROUTES) {
      const { container, unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });

      const shell = container.querySelector('div[style*="min-height"]');
      expect(shell, `route ${route} should render a PageShell root`).not.toBeNull();
      expect(shell?.getAttribute("style")).toContain("100dvh");

      // 해당 라우트의 페이지가 실제로 매칭되어 렌더됐는지도 함께 확인한다.
      expect(container.textContent).toContain(ROUTE_TITLES[route]);

      unmount();
    }
  });

  it("AC-1[P0]: src/pages 하위 라우트 페이지 소스는 모두 ScreenScaffold를 import해 사용한다 (raw div 골격 금지)", () => {
    const pageFiles = ["HomePage.tsx", "InputPage.tsx", "ReportPage.tsx", "PlanPage.tsx", "DiagnosisPage.tsx"];
    for (const file of pageFiles) {
      const src = fs.readFileSync(path.resolve(SRC_DIR, "pages", file), "utf-8");
      expect(src, `${file} should import ScreenScaffold`).toMatch(
        /import\s*{\s*ScreenScaffold\s*}\s*from\s*["']@\/components\/ScreenScaffold["']/,
      );
      expect(src, `${file} should render <ScreenScaffold>`).toMatch(/<ScreenScaffold[\s>]/);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-2[P0]: 전체 테스트 스위트가 실패 0·스킵 0으로 통과한다
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: src/__tests__ 아래 어떤 테스트 파일에도 skip/todo/only 마커가 없다 (전부 실행·통과 대상)", () => {
    const offenders: string[] = [];
    const forbidden = /\b(it|test|describe)\.(skip|todo|only)\s*\(|\bx(it|describe)\s*\(/;

    for (const file of fs.readdirSync(TESTS_DIR)) {
      if (!/\.(test)\.(ts|tsx)$/.test(file)) continue;
      const src = fs.readFileSync(path.join(TESTS_DIR, file), "utf-8");
      if (forbidden.test(src)) offenders.push(file);
    }

    expect(offenders).toEqual([]);
  });

  it("AC-2: App.tsx의 모든 <Route path> 각각이 크래시 없이 렌더된다 (실패로 남는 라우트가 없다)", () => {
    const appSrc = fs.readFileSync(path.resolve(SRC_DIR, "App.tsx"), "utf-8");
    const routePaths = Array.from(appSrc.matchAll(/<Route\s+path="([^"]+)"/g)).map((m) => m[1]);

    // 5개 실제 라우트가 App.tsx에 모두 선언돼 있다.
    for (const route of ROUTES) {
      expect(routePaths).toContain(route);
    }

    for (const route of ROUTES) {
      expect(() => {
        const { unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [route],
        });
        unmount();
      }, `route ${route} should not throw`).not.toThrow();
    }
  });
});
