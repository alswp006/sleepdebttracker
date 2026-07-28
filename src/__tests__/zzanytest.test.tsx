import { describe, it, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DebugProbeLog } from "@/components/__zzDebugProbe";

vi.mock("some-totally-unrelated-fake-module", () => ({ foo: "bar" }));

describe("any vi.mock call", () => {
  it("checks if any vi.mock call breaks cross-module location", () => {
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
