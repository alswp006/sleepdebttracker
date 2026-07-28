import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";

mockTds();
mockAppsInToss();
mockTossRewardAd();

describe("debug ftb direct", () => {
  it("renders FloatingTabBar with correct active tab for /report", () => {
    const { getByRole } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(FloatingTabBar, {
          items: [
            { label: "홈", path: "/" },
            { label: "리포트", path: "/report" },
            { label: "플랜", path: "/plan" },
          ],
        }),
      ),
    );
    const reportTab = getByRole("tab", { name: "리포트" });
    console.log("aria-selected=", reportTab.getAttribute("aria-selected"));
    expect(reportTab.getAttribute("aria-selected")).toBe("true");
  });
});
