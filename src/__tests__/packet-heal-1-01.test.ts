import { describe, it, expect } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { SDT_KEYS } from "@/lib/types";
import App from "@/App";

// ============================================================================
// IMPORTANT: TDD red-phase tests for packet heal-1-01 (단일 라우팅/Provider
// 진입점으로 통합). 0011/0013에서 App.tsx 하나에 Routes를 몰아넣긴 했지만,
// FloatingTabBar는 여전히 각 페이지(Home/Report/Plan/Diagnosis)에서 개별
// 렌더된다(라우트 밖 1회 렌더가 아님). 이 패킷은:
//   1) <BrowserRouter>(main.tsx)/<Routes>(App.tsx)가 각각 정확히 1회만 존재
//   2) FloatingTabBar를 라우트 밖에서 1회만 렌더(페이지마다 중복 렌더 제거)
//   3) 라우트 트리를 감싸는 단일 Provider 아래에서 모든 페이지가 저장소
//      데이터를 일관되게 읽는다(중첩 라우터/중복 마운트로 상태가 끊기지 않음)
// 를 요구한다. 아래 테스트는 통과하기 위해 App.tsx(및 필요 시 main.tsx 외부의
// 새 라우트/셸 파일)의 구조 변경을 요구하므로 현재 코드베이스에서는 실패한다.
// ============================================================================

mockAll();

const SRC_DIR = path.resolve(__dirname, "..");

function readIfExists(...segments: string[]): string {
  const p = path.resolve(SRC_DIR, ...segments);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "";
}

describe("단일 라우팅/Provider 진입점으로 통합", () => {
  // ──────────────────────────────────────────────────────────────────────
  // AC-1[P0]: <BrowserRouter>/<Routes>가 앱 전체에 각각 정확히 1회만 존재
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1[P0]: 앱 소스 전체에 <BrowserRouter>가 정확히 1회만 존재한다", () => {
    const combined = [
      readIfExists("main.tsx"),
      readIfExists("App.tsx"),
      readIfExists("routes", "index.tsx"),
    ].join("\n");

    const matches = combined.match(/<BrowserRouter[\s/>]/g) ?? [];
    expect(matches.length).toBe(1);
    // main.tsx는 @AI:ANCHOR 보호 대상이라, 유일한 BrowserRouter는 main.tsx 소유여야 한다.
    const mainSrc = readIfExists("main.tsx");
    expect(mainSrc).toContain("BrowserRouter");
    expect(mainSrc).toContain("@AI:ANCHOR");
  });

  it("AC-1[P0]: 앱 소스 전체에 <Routes>가 정확히 1회만 존재한다 (중첩 Routes 금지)", () => {
    const combined = [
      readIfExists("main.tsx"),
      readIfExists("App.tsx"),
      readIfExists("routes", "index.tsx"),
    ].join("\n");

    const matches = combined.match(/<Routes[\s>]/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("AC-1: App.tsx는 자체 <BrowserRouter>를 정의하지 않는다 (MemoryRouter로 감싸도 라우터 중첩 에러 없이 렌더된다)", () => {
    const appSrc = readIfExists("App.tsx");
    expect(appSrc).not.toMatch(/<BrowserRouter/);

    expect(() =>
      render(
        React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
      ),
    ).not.toThrow();
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-2[P0]: 5개 라우트 모두 렌더 + FloatingTabBar는 라우트 밖에서 1회만 렌더
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2[P0]: 개별 페이지(src/pages/*)는 더 이상 FloatingTabBar를 직접 import/렌더하지 않는다", () => {
    const pagesDir = path.resolve(SRC_DIR, "pages");
    const offenders: string[] = [];
    for (const file of fs.readdirSync(pagesDir)) {
      if (!file.endsWith(".tsx")) continue;
      const src = fs.readFileSync(path.join(pagesDir, file), "utf-8");
      if (src.includes("FloatingTabBar")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("AC-2[P0]: FloatingTabBar는 App.tsx(또는 src/routes/index.tsx)에서 <Routes> 밖에 정확히 1회만 렌더된다", () => {
    const appSrc = readIfExists("App.tsx");
    const routesSrc = readIfExists("routes", "index.tsx");
    const combined = `${appSrc}\n${routesSrc}`;

    const renderCount = (combined.match(/<FloatingTabBar[\s/>]/g) ?? []).length;
    expect(renderCount).toBe(1);
    expect(combined).toContain("import { FloatingTabBar }");

    // <Routes>...</Routes> 블록 내부에는 FloatingTabBar가 없어야 한다(라우트 밖 1회 렌더).
    const routesBlockMatch = combined.match(/<Routes>[\s\S]*?<\/Routes>/);
    expect(routesBlockMatch).not.toBeNull();
    expect(routesBlockMatch?.[0]).not.toContain("FloatingTabBar");
  });

  it("AC-2[P0]: /, /report, /plan, /diagnosis 각 경로에서 FloatingTabBar(nav[role=tablist])가 정확히 1개만 렌더된다", async () => {
    for (const route of ["/", "/report", "/plan", "/diagnosis"]) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });

      await waitFor(() => {
        expect(screen.getAllByRole("tablist").length).toBe(1);
      });

      unmount();
    }
  });

  it("AC-2[P0]: /input 경로는 크래시 없이 렌더되고, FloatingTabBar가 있더라도 중복 렌더되지 않는다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/input"] });
    expect(document.body.textContent).not.toBe("");
    expect(screen.queryAllByRole("tablist").length).toBeLessThanOrEqual(1);
  });

  it("AC-2: 탭 클릭으로 경로를 전환해도(홈→리포트) FloatingTabBar는 계속 1개만 유지된다", async () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    await waitFor(() => {
      expect(screen.getAllByRole("tablist").length).toBe(1);
    });

    fireEvent.click(screen.getByRole("tab", { name: "리포트" }));

    await waitFor(() => {
      expect(screen.getAllByRole("tablist").length).toBe(1);
    });
    // 리포트 화면 콘텐츠로 전환됐는지 함께 확인 (탭 전환이 실제로 일어났다)
    expect(screen.getByText("주간 리포트")).toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-3[P0]: 단일 Provider 트리 아래에서 모든 페이지가 일관된 스토어 값을 읽는다
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3[P0]: /input에서 저장한 기록이 같은 앱 트리 안에서 홈 화면에 즉시 반영된다 (중복 마운트로 상태 단절 없음)", async () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    // 최초엔 기록이 없어 빈 상태 CTA가 보인다.
    const startBtn = await screen.findByRole("button", { name: "첫 수면 기록하기" });
    fireEvent.click(startBtn);

    // /input으로 이동 — 같은 App 트리 안에서 라우트만 전환된다.
    const bedInput = await screen.findByLabelText(/취침 시간/);
    const wakeInput = screen.getByLabelText(/기상 시간/);
    fireEvent.change(bedInput, { target: { value: "23:30" } });
    fireEvent.change(wakeInput, { target: { value: "06:30" } });
    fireEvent.click(screen.getByRole("button", { name: "기록 저장" }));

    // 홈으로 복귀 — 새 기록이 즉시 대시보드에 반영돼야 한다(스토어 값이 페이지 간 일관됨).
    await waitFor(() => {
      expect(screen.queryByText("첫 수면 기록하기")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("debt-hero")).toBeInTheDocument();

    const raw = localStorage.getItem(SDT_KEYS.records);
    expect(raw).not.toBeNull();
    expect(Object.keys(JSON.parse(raw as string)).length).toBe(1);
  });

  it("AC-3: 사전에 저장된 기록이 있으면 앱 루트에서 어떤 라우트로 진입하든 동일한 스토어 값을 읽는다", async () => {
    seedLocalStorage({
      [SDT_KEYS.records]: {
        "2026-07-20": {
          id: "2026-07-20",
          bedTime: "23:00",
          wakeTime: "05:00",
          sleepMinutes: 360,
          debtMinutes: 300,
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
    });

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    await waitFor(() => {
      expect(screen.getByTestId("debt-hero")).toBeInTheDocument();
    });
  });
});
