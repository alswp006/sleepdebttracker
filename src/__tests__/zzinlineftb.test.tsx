import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function InlineFTB({ items }: { items: { label: string; path: string }[] }) {
  const location = useLocation();
  return React.createElement(
    "nav",
    null,
    items.map((item) => {
      const active = location.pathname === item.path;
      return React.createElement(
        "button",
        { key: item.path, role: "tab", "aria-selected": active },
        item.label,
      );
    }),
  );
}

describe("inline ftb", () => {
  it("inline component with same hook works?", () => {
    const { getByRole } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(InlineFTB, { items: [{ label: "리포트", path: "/report" }] }),
      ),
    );
    console.log("aria-selected=", getByRole("tab", { name: "리포트" }).getAttribute("aria-selected"));
  });
});
