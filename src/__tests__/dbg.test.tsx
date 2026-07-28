import { describe, it } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation, UNSAFE_LocationContext } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { ImportedProbe, importedLocationContext } from "@/__probe";
mockTds();
mockAppsInToss();
mockTossRewardAd();

// tag the test-graph context object
(UNSAFE_LocationContext as any).__tag = "TEST_GRAPH";

function InlineProbe() {
  const loc = useLocation();
  const ctx = React.useContext(UNSAFE_LocationContext) as any;
  console.log("INLINE pathname=", loc.pathname, "tag=", (UNSAFE_LocationContext as any).__tag, "ctxLoc=", ctx?.location?.pathname);
  return null;
}

describe("dbg render", () => {
  it("render probes", () => {
    console.log("SAME_CTX_OBJ", UNSAFE_LocationContext === importedLocationContext, "importedTag=", (importedLocationContext as any).__tag);
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(InlineProbe),
        React.createElement(ImportedProbe),
      ),
    );
  });
});
