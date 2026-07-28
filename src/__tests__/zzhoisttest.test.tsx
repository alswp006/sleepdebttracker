import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
// import mockRouter but never call it
import { mockRouter } from "@/__tests__/__helpers__/mocks-router";

function Probe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "p" }, loc.pathname);
}

describe("hoist test", () => {
  it("checks if merely importing mockRouter hoists vi.mock", () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(Probe)),
    );
    console.log("PATHNAME=", getByTestId("p").textContent, "mockRouter typeof=", typeof mockRouter);
  });
});
