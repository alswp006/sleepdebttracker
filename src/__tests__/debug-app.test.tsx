import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { srcUseLocation } from "@/__rrcheck";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";
mockTds(); mockAppsInToss(); mockTossRewardAd();

describe("debug replicate", () => {
  it("identity with top-level mock calls + testing-library", () => {
    console.log("FTB", typeof FloatingTabBar, "render", typeof render);
    console.log("IDENTITY", useLocation === srcUseLocation);
    expect(true).toBe(true);
  });
});
