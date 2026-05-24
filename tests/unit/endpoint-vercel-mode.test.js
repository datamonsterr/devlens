import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("endpoint Vercel mode", () => {
  it("detects deployed endpoint mode from tunnel status", () => {
    const source = readRepoFile("src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js");

    expect(source).toContain("setIsVercelEndpoint(vercelMode)");
    expect(source).toContain("!!data.tunnel?.unsupported");
    expect(source).toContain("Deployed Vercel endpoint active");
  });

  it("hides local tunnel controls in deployed endpoint mode", () => {
    const source = readRepoFile("src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js");

    expect(source).toContain("isManager && tunnelEnabled && !isVercelEndpoint");
    expect(source).toContain("isManager && !isVercelEndpoint && !tunnelEnabled");
    expect(source).toContain("isManager && !isVercelEndpoint && (tunnelLoading");
  });

  it("preserves local quick tunnel enable flow", () => {
    const source = readRepoFile("src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js");

    expect(source).toContain("title=\"Enable Tunnel\"");
    expect(source).toContain("Cloudflare Tunnel");
    expect(source).toContain("Start Tunnel");
    expect(source).toContain("setShowEnableTunnelModal(true)");
  });
});
