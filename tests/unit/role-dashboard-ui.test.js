import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("role dashboard UI wiring", () => {
  it("shows manager and developer navigation targets", () => {
    const sidebar = read("src/shared/components/Sidebar.js");
    expect(sidebar).toContain("/dashboard/team");
    expect(sidebar).toContain("/dashboard/usage");
    expect(sidebar).toContain("CLI Config");
    expect(sidebar).toContain("/dashboard/console-log");
  });

  it("has onboarding role selection", () => {
    const onboarding = read("src/app/onboarding/page.js");
    expect(onboarding).toContain("Team manager");
    expect(onboarding).toContain("Team member");
  });
});
