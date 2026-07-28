import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";

mockTds();
mockAppsInToss();
mockTossRewardAd();

let probeLoc: any = null;
function Probe() {
  const loc = useLocation();
  probeLoc = loc;
  return React.createElement("div", { "data-testid": "p" }, loc.pathname);
}

describe("probe3", () => {
  it("shows pathname next to FloatingTabBar", () => {
    const { getByTestId, getByRole } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(Probe),
        React.createElement(FloatingTabBar, {
          items: [
            { label: "홈", path: "/" },
            { label: "리포트", path: "/report" },
          ],
        }),
      ),
    );
    console.log("PATHNAME=", getByTestId("p").textContent);
    const tab = getByRole("tab", { name: "리포트" });
    console.log("aria-selected=", tab.getAttribute("aria-selected"));
    console.log("outerHTML=", tab.outerHTML);
    expect(getByTestId("p").textContent).toBe("/report");
  });
});
