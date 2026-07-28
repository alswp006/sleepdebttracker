import { describe, it, expect } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import App from "@/App";

mockAll();

describe("라우팅 와이어링 + Provider 연결 + 통합 폴리시", () => {
  it("AC-1[P0]: App.tsx가 모든 페이지에 대응하는 Route를 정의한다", () => {
    const appSrc = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf-8");
    const expectedRoutes = ["/", "/input", "/report", "/plan", "/diagnosis"];
    for (const route of expectedRoutes) {
      expect(appSrc).toMatch(new RegExp(`path=["']${route.replace("/", "\\/")}["']`));
    }
    expect(appSrc).toContain("HomePage");
    expect(appSrc).toContain("InputPage");
    expect(appSrc).toContain("ReportPage");
    expect(appSrc).toContain("PlanPage");
    expect(appSrc).toContain("DiagnosisPage");
  });

  it("AC-2[P0]: 모든 페이지의 navigate() 대상 경로가 App.tsx Route에 존재한다", () => {
    const pagesDir = path.resolve(__dirname, "../pages");
    const componentsDir = path.resolve(__dirname, "../components");
    const appSrc = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf-8");

    const routePathPattern = /<Route\s+path=["']([^"']+)["']/g;
    const definedRoutes = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = routePathPattern.exec(appSrc))) {
      definedRoutes.add(m[1]);
    }

    const navigateTargets = new Set<string>();
    const navPattern = /navigate\(\s*["'`]([^"'`]+)["'`]/g;
    for (const dir of [pagesDir, componentsDir]) {
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const src = fs.readFileSync(path.join(dir, file), "utf-8");
        let n: RegExpExecArray | null;
        while ((n = navPattern.exec(src))) {
          navigateTargets.add(n[1]);
        }
      }
    }

    expect(navigateTargets.size).toBeGreaterThan(0);
    for (const target of navigateTargets) {
      expect(definedRoutes.has(target)).toBe(true);
    }
    expect(definedRoutes.has("/input")).toBe(true);
    expect(definedRoutes.has("/")).toBe(true);
  });

  it("AC-3[P0]: main.tsx가 TDSMobileAITProvider와 BrowserRouter를 유지한다", () => {
    const mainSrc = fs.readFileSync(path.resolve(__dirname, "../main.tsx"), "utf-8");
    expect(mainSrc).toContain("TDSMobileAITProvider");
    expect(mainSrc).toContain("BrowserRouter");
    expect(mainSrc).toContain("@AI:ANCHOR");
  });

  it("AC-4[P0]: '/' 경로에서 앱이 크래시 없이 렌더된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    expect(document.body.textContent).not.toBe("");
    expect(screen.queryByRole("alertdialog")).not.toBeNull();
  });

  it("AC-4[P1]: /input, /report, /plan, /diagnosis 경로 각각 크래시 없이 렌더된다", () => {
    for (const route of ["/input", "/report", "/plan", "/diagnosis"]) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });
      expect(document.body.textContent).not.toBe("");
      unmount();
    }
  });

  it("통합: 정의되지 않은 경로로 이동해도 앱이 크래시하지 않는다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/unknown-route"] });
    expect(document.body).toBeTruthy();
  });
});
