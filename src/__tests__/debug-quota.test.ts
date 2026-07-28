import { describe, it, expect } from "vitest";

// Scratch file used to diagnose jsdom Storage mocking behavior during
// packet-0002 implementation. Kept as a trivial passing test since this
// sandbox blocks file deletion.
describe("debug-quota (scratch, safe to ignore)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
