import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { mockRouter } from "@/__tests__/__helpers__/mocks-router";

// ============================================================================
// IMPORTANT: These are TDD red-phase tests. They define expected behavior for
// src/components/ScreenScaffold.tsx (공통 페이지 골격):
// - AC-1: children이 TDS 기반 세로 스크롤 컨테이너로 렌더
// - AC-2: 하단 고정 슬롯이 env(safe-area-inset-bottom)/var(--toss-safe-area-bottom) 반영
// - AC-3: HEX 색상 하드코딩 없음 (var(--tds-color-*)/adaptive 토큰만 사용)
// - AC-4: 임의 children 렌더 시 크래시 없이 레이아웃 정상
// ============================================================================

mockTds();
mockAppsInToss();
mockRouter();

const { ScreenScaffold } = await import("@/components/ScreenScaffold");

function renderScaffold(ui: React.ReactElement) {
  return render(React.createElement(MemoryRouter, null, ui));
}

describe("공통 ScreenScaffold 레이아웃 컴포넌트 (packet-0005)", () => {
  // ──────────────────────────────────────────────────────────────────────
  // AC-1[P0]: children을 받아 TDS 기반 세로 스크롤 컨테이너로 렌더
  // ──────────────────────────────────────────────────────────────────────

  it("AC-1a[P0]: renders children inside a full-height page container", () => {
    const { container } = renderScaffold(
      React.createElement(ScreenScaffold, {
        children: React.createElement("p", { "data-testid": "body-content" }, "본문 내용"),
      }),
    );

    expect(screen.getByTestId("body-content")).toBeInTheDocument();
    expect(screen.getByText("본문 내용")).toBeInTheDocument();

    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.style.minHeight).toBe("100dvh");
  });

  it("AC-1b[P0]: renders optional top slot above children and removes duplicate top padding", () => {
    const { container } = renderScaffold(
      React.createElement(ScreenScaffold, {
        top: React.createElement("h1", null, "타이틀"),
        children: React.createElement("p", { "data-testid": "body-content" }, "본문"),
      }),
    );

    expect(screen.getByText("타이틀")).toBeInTheDocument();
    expect(screen.getByTestId("body-content")).toBeInTheDocument();

    // top이 있으면 자체 safe-area를 처리하므로 PageShell의 paddingTop은 제거되어야 함
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.paddingTop).toBe("0px");
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-2[P0]: 하단 고정 슬롯이 safe-area-inset-bottom 반영
  // ──────────────────────────────────────────────────────────────────────

  it("AC-2a[P0]: renders bottom slot content", () => {
    renderScaffold(
      React.createElement(ScreenScaffold, {
        bottom: React.createElement("div", { "data-testid": "bottom-slot" }, "하단 CTA"),
        children: React.createElement("p", null, "본문"),
      }),
    );

    expect(screen.getByTestId("bottom-slot")).toBeInTheDocument();
    expect(screen.getByText("하단 CTA")).toBeInTheDocument();
  });

  it("AC-2b[P0]: page container reserves safe-area-inset-bottom padding so a fixed bottom slot never gets clipped", () => {
    const { container } = renderScaffold(
      React.createElement(ScreenScaffold, {
        bottom: React.createElement("div", { "data-testid": "bottom-slot" }, "하단 CTA"),
        children: React.createElement("p", null, "본문"),
      }),
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.paddingBottom).toContain("var(--toss-safe-area-bottom)");
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-3[P0]: HEX 색상 하드코딩 없음, var(--tds-color-*)/adaptive 토큰만 사용
  // ──────────────────────────────────────────────────────────────────────

  it("AC-3a[P0]: ScreenScaffold source contains no hardcoded HEX colors", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/ScreenScaffold.tsx"),
      "utf-8",
    );

    const hexMatches = source.match(/#[0-9a-fA-F]{3,8}\b/g);
    expect(hexMatches).toBeNull();
  });

  it("AC-3b[P0]: PageShell background uses a CSS variable token, not a hardcoded color", () => {
    const { container } = renderScaffold(
      React.createElement(ScreenScaffold, { children: React.createElement("p", null, "본문") }),
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.backgroundColor).toMatch(/^var\(--/);
    expect(root.style.backgroundColor).not.toMatch(/^#/);
  });

  // ──────────────────────────────────────────────────────────────────────
  // AC-4: 임의 children 렌더 시 크래시 없이 레이아웃 정상
  // ──────────────────────────────────────────────────────────────────────

  it("AC-4a: renders without crashing when given no top/bottom slots (defaults)", () => {
    expect(() =>
      renderScaffold(
        React.createElement(ScreenScaffold, {
          children: React.createElement("span", null, "단일 텍스트"),
        }),
      ),
    ).not.toThrow();
    expect(screen.getByText("단일 텍스트")).toBeInTheDocument();
  });

  it("AC-4b: renders arbitrary nested/multiple children without crashing", () => {
    expect(() =>
      renderScaffold(
        React.createElement(ScreenScaffold, {
          top: React.createElement("h1", null, "제목"),
          bottom: React.createElement("div", { "data-testid": "bottom-slot" }, "CTA"),
          children: React.createElement(
            "div",
            null,
            React.createElement("p", null, "첫째 문단"),
            React.createElement("ul", null, React.createElement("li", null, "항목 1")),
          ),
        }),
      ),
    ).not.toThrow();

    expect(screen.getByText("제목")).toBeInTheDocument();
    expect(screen.getByText("첫째 문단")).toBeInTheDocument();
    expect(screen.getByText("항목 1")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-slot")).toBeInTheDocument();
  });
});
