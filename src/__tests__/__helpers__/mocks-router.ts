/**
 * react-router-dom mock — kept in its OWN file, separate from mocks.ts.
 *
 * WHY: Vitest hoists every `vi.mock(...)` call to the top of the file it's
 * written in, even when the call sits inside a function body that's never
 * invoked (hoisting is a static per-file AST transform, not control-flow
 * aware). If this mock lived in mocks.ts alongside mockTds/mockAppsInToss,
 * merely importing those (without ever calling mockRouter()) would still
 * hoist-and-execute this vi.mock("react-router-dom", ...) as soon as
 * mocks.ts loads — silently replacing useLocation with a static value for
 * every test, including ones that deliberately want real routing (see
 * packet-0011.test.ts, packet-0012.test.ts). Splitting the file means tests
 * that don't import from here never trigger this mock.
 *
 * Use when you want an isolated page render with a spy-able useNavigate and
 * a mutable static useLocation (see packet-0006/0007 for the mutation
 * pattern). Do NOT use for tests that render the full App and rely on real
 * route matching / FloatingTabBar active-tab detection.
 */
import { vi } from "vitest";

export const mockNavigate = vi.fn();
export const mockLocation = { pathname: "/", search: "", state: null, key: "default" };

export function mockRouter() {
  vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
    return {
      ...actual,
      useNavigate: () => mockNavigate,
      useLocation: () => mockLocation,
    };
  });
}
