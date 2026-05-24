import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const middlewareSource = readFileSync(resolve(import.meta.dirname, "../../src/middleware.ts"), "utf8");

describe("Clerk middleware route protection", () => {
  it("matches API routes then Clerk proxy routes without protecting v1 API Key routes", () => {
    const apiMatcherIndex = middlewareSource.indexOf('"/(api|trpc)(.*)"');
    const clerkMatcherIndex = middlewareSource.indexOf('"/__clerk/(.*)"');

    expect(apiMatcherIndex).toBeGreaterThan(-1);
    expect(clerkMatcherIndex).toBeGreaterThan(apiMatcherIndex);
    expect(middlewareSource.match(/"\/__clerk\/\(\.\*\)"/g)).toHaveLength(1);
    expect(middlewareSource).toContain('"/api/v1(.*)"');
    expect(middlewareSource).toContain('"/api/v1beta(.*)"');
    expect(middlewareSource).toContain("/api/((?!v1|v1beta|");
  });
});
