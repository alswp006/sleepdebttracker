import { describe, it, expect } from "vitest";
import React from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { render } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockTossRewardAd();

function Probe() {
  const loc = useLocation();
  console.log("PROBE PATHNAME=", JSON.stringify(loc.pathname));
  return null;
}

describe("debug", () => {
  it("logs tab active for ReportPage directly", async () => {
    const ReportPage = (await import("@/pages/ReportPage")).default;
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(React.Fragment, null,
          React.createElement(Probe),
          React.createElement(ReportPage),
        ),
      ),
    );
    expect(true).toBe(true);
  });
});
