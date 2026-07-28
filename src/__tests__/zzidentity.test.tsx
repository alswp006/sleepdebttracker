import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation, UNSAFE_LocationContext } from "react-router-dom";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";

mockTds();
mockAppsInToss();
mockTossRewardAd();

describe("identity", () => {
  it("checks context identity", () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/report"] },
        React.createElement(UNSAFE_LocationContext.Consumer, null, ((ctx: unknown) => {
          console.log("Outer LocationContext value=", ctx);
          return null;
        }) as unknown as React.ReactNode),
        React.createElement(FloatingTabBar, {
          items: [{ label: "리포트", path: "/report" }],
        }),
      ),
    );
  });
});
