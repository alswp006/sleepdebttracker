import { describe, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

function Probe() {
  const loc = useLocation();
  console.log("PATHNAME=", JSON.stringify(loc));
  return null;
}

describe("probe", () => {
  it("logs location", () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(Probe)),
    );
  });
});
