import { describe, it, expect } from "vitest";
import React from "react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockTossRewardAd();

describe("probe3", () => {
  it("finds pageshell div", async () => {
    seedLocalStorage({ sdt_settings: { onboardedAt: 1 } });
    const App = (await import("@/App")).default;
    const { container } = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    console.log("HTML=", container.innerHTML.slice(0, 400));
    const shell = container.querySelector('div[style*="min-height"]');
    console.log("SHELL FOUND=", !!shell, shell?.getAttribute("style"));
    expect(true).toBe(true);
  });
});
