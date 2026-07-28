import { describe, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DebugProbeLog } from "@/components/__zzDebugProbe";

vi.mock("@toss/tds-mobile", () => ({ Button: () => null }));

describe("minimal tds mock", () => {
  it("checks minimal factory without React reference", () => {
    let captured: any = null;
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(DebugProbeLog, { onLoc: (l: any) => { captured = l; } }),
      ),
    );
    console.log("captured=", captured);
  });
});
