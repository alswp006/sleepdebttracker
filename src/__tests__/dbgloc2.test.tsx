import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

function Probe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "p" }, loc.pathname);
}

describe("probe2", () => {
  it("shows pathname", () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(Probe)),
    );
    console.log("PATHNAME=", getByTestId("p").textContent);
    expect(getByTestId("p").textContent).toBe("/report");
  });
});
