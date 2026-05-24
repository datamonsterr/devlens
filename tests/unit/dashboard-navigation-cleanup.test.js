import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("dashboard navigation cleanup", () => {
  it("keeps legacy top-right actions out of HeaderMenu", () => {
    const source = readRepoFile("src/shared/components/HeaderMenu.js");

    expect(source).not.toMatch(/Donate|Changelog|Change Log|Shutdown|Remote/);
  });

  it("keeps obsolete dashboard navigation actions hidden", () => {
    const source = readRepoFile("src/shared/components/Sidebar.js");

    expect(source).not.toMatch(/Donate|Changelog|Change Log|Shutdown|Remote|Tailscale|Proxy Pool|Device Sync|Cloud Sync/);
    expect(source).toContain("/dashboard/endpoint");
    expect(source).toContain("/dashboard/keys");
    expect(source).toContain("/dashboard/console-log");
  });

  it("keeps obsolete settings controls hidden", () => {
    const source = readRepoFile("src/app/(dashboard)/dashboard/profile/page.js");

    expect(source).not.toMatch(/Reset Password|Default password|Auth Token|OIDC|CLI auto-config|Tailscale|Proxy Pool|Device Sync|Cloud Sync/);
  });
});
