import { describe, it, expect } from "vitest";
import * as RRD_before from "react-router-dom";
import { mockTds } from "@/__tests__/__helpers__/mocks";

describe("identity check", () => {
  it("compares react-router-dom module identity before/after mockTds()", async () => {
    const RRD_before2 = await import("react-router-dom");
    console.log("before === before2 useLocation:", RRD_before.useLocation === RRD_before2.useLocation);

    mockTds();

    const RRD_after = await import("react-router-dom");
    console.log("before === after useLocation:", RRD_before.useLocation === RRD_after.useLocation);
    console.log("before useLocation:", RRD_before.useLocation.toString().slice(0, 80));
    console.log("after  useLocation:", RRD_after.useLocation.toString().slice(0, 80));
  });
});
