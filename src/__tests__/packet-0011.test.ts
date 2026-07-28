import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

// NOTE: react-router-dom은 일부러 mock하지 않는다(mockRouter()는 useLocation을 고정값으로
// 대체해 실제 라우트 전환/활성 탭(FloatingTabBar)을 검증할 수 없게 만든다). TDS/SDK만 mock하고
// MemoryRouter + 실제 react-router-dom으로 진짜 라우팅 동작을 검증한다.
mockTds();
mockAppsInToss();
mockTossRewardAd();

// Top mock(mocks.ts)이 title을 <h1><h1>텍스트</h1></h1>로 중첩 렌더해 getByRole("heading")이
// "multiple elements found"로 터진다 — 가장 안쪽 h1(실제 페이지 제목)의 textContent로 비교한다.
function pageTitleText(container: HTMLElement): string {
  const headings = Array.from(container.querySelectorAll("h1"));
  const innermost = headings[headings.length - 1];
  return innermost?.textContent?.trim() ?? "";
}

describe("라우팅 배선 + FloatingTabBar 연결", () => {
  it("AC-1[P0]: '/' '/input' '/report' '/plan' '/diagnosis' 5개 경로가 각각 다른 페이지를 렌더한다", async () => {
    const App = (await import("@/App")).default;

    const paths: Array<[string, string]> = [
      ["/", "수면 부채"],
      ["/input", "오늘 수면 기록"],
      ["/report", "주간 리포트"],
      ["/plan", "회복 수면 플랜"],
      ["/diagnosis", "수면 유형 진단"],
    ];

    for (const [initialPath, expectedTitle] of paths) {
      const { container, unmount } = renderWithRouter(
        React.createElement(App),
        { initialEntries: [initialPath] },
      );
      expect(pageTitleText(container)).toBe(expectedTitle);
      unmount();
    }
  });

  it("AC-1[P0]: 정의되지 않은 경로 목록에 5개 페이지가 모두 존재한다(회귀 방지)", async () => {
    const App = (await import("@/App")).default;
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/"],
    });
    // 홈 페이지는 렌더되고, 다른 4개 라우트로 이동할 수 있는 탭이 존재해야 한다
    const tabs = within(container).getAllByRole("tab");
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    expect(pageTitleText(container)).toBe("수면 부채");
  });

  it("AC-2: FloatingTabBar가 홈·리포트·플랜 탭을 렌더하고 현재 경로 탭만 활성(aria-selected)이다", async () => {
    const App = (await import("@/App")).default;
    renderWithRouter(React.createElement(App), { initialEntries: ["/report"] });

    const homeTab = screen.getByRole("tab", { name: "홈" });
    const reportTab = screen.getByRole("tab", { name: "리포트" });
    const planTab = screen.getByRole("tab", { name: "플랜" });

    expect(homeTab).toBeInTheDocument();
    expect(reportTab).toBeInTheDocument();
    expect(planTab).toBeInTheDocument();

    expect(reportTab).toHaveAttribute("aria-selected", "true");
    expect(homeTab).toHaveAttribute("aria-selected", "false");
    expect(planTab).toHaveAttribute("aria-selected", "false");
  });

  it("AC-2: 탭 클릭 시 해당 경로의 페이지 콘텐츠로 전환된다", async () => {
    const App = (await import("@/App")).default;

    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/"],
    });
    expect(pageTitleText(container)).toBe("수면 부채");

    const planTab = screen.getByRole("tab", { name: "플랜" });
    fireEvent.click(planTab);

    expect(pageTitleText(container)).toBe("회복 수면 플랜");
    expect(screen.getByRole("tab", { name: "플랜" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-3: main.tsx는 @AI:ANCHOR로 보호되며 TDSMobileAITProvider/BrowserRouter 배선을 유지한다(수정 금지 회귀 가드)", () => {
    const mainSrc = fs.readFileSync(
      path.resolve(__dirname, "../main.tsx"),
      "utf-8",
    );
    expect(mainSrc).toContain("@AI:ANCHOR");
    expect(mainSrc).toContain("TDSMobileAITProvider");
    expect(mainSrc).toContain("BrowserRouter");
  });

  it("AC-4: App.tsx의 모든 라우트가 크래시 없이 마운트된다(통합 스모크)", async () => {
    const App = (await import("@/App")).default;
    const routes = ["/", "/input", "/report", "/plan", "/diagnosis"];

    for (const route of routes) {
      expect(() => {
        const { unmount } = renderWithRouter(React.createElement(App), {
          initialEntries: [route],
        });
        unmount();
      }).not.toThrow();
    }
  });

  it("AC-4: 존재하지 않는 경로는 5개 정의된 라우트 중 어느 것도 매칭하지 않는다(RouteState 안전성)", async () => {
    const App = (await import("@/App")).default;
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/does-not-exist"],
    });
    expect(pageTitleText(container)).not.toBe("수면 부채");
    expect(pageTitleText(container)).not.toBe("주간 리포트");
    expect(container.querySelectorAll("h1").length).toBe(0);
  });
});
