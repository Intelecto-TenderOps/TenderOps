import { describe, expect, it } from "vitest";
import { DomainError, isTransientStatus } from "../src/shared/errors.js";

describe("retry policy", () => {
  it("retries only transient statuses", () => {
    expect(isTransientStatus(429)).toBe(true);
    expect(isTransientStatus(503)).toBe(true);
    expect(isTransientStatus(400)).toBe(false);
    expect(isTransientStatus(401)).toBe(false);
    const limited = new DomainError(503, "secop_rate_limited", true, 2);
    expect(limited.transient).toBe(true);
    expect(limited.retryAfter).toBe(2);
  });
});
