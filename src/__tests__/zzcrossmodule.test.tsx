import { describe, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import { DebugProbeLog } from "@/components/__zzDebugProbe";

mockTds();

describe("cross module", () => {
  it("checks if imported component sees correct location", () => {
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
