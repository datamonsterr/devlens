import { describe, it, expect, vi } from "vitest";

const MOCK_UUID = "mock-uuid-001";
const MOCK_KEY = "devlens_mockkey123";
const MOCK_HASH =
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

vi.mock("uuid", () => ({ v4: vi.fn(() => MOCK_UUID) }));
vi.mock("@/lib/apiKeyUtils", () => ({
  generateApiKey: vi.fn(() => `dvl_${MOCK_KEY}`),
  hashApiKey: vi.fn(() => MOCK_HASH),
}));

describe("team invite and api key integration", () => {
  it("POST invite rejects missing email", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      requireManagerContext: vi.fn().mockResolvedValue({
        teamId: "team-a",
        clerkOrgId: "org-a",
      }),
    }));
    const { POST } = await import("@/app/api/team/members/route.js");
    const req = new Request("https://devlens.test/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("Email required");
  });

  it("POST invite returns failure when Clerk invite fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      requireManagerContext: vi.fn().mockResolvedValue({
        teamId: "team-a",
        clerkOrgId: "org-a",
      }),
    }));
    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue({
        get: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue(undefined),
        all: vi.fn().mockResolvedValue([]),
      }),
    }));
    vi.doMock("@/lib/onboardingEmail", () => ({
      getPublicAppUrl: vi.fn(() => "https://devlens.test"),
      getApiBaseUrl: vi.fn(() => "https://devlens.test/v1"),
      sendDeveloperOnboardingEmail: vi.fn().mockResolvedValue({ status: "skipped" }),
    }));
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_xxx");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: "email address is already taken" }] }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/team/members/route.js");
    const req = new Request("https://devlens.test/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.error).toContain("email address");
  });

  it("POST invite creates pending member with api key idempotently", async () => {
    vi.resetModules();
    const runMock = vi.fn().mockResolvedValue(undefined);
    const sendDeveloperOnboardingEmail = vi.fn().mockResolvedValue({ status: "skipped" });
    vi.doMock("@/lib/auth", () => ({
      requireManagerContext: vi.fn().mockResolvedValue({
        teamId: "team-a",
        clerkOrgId: "org-a",
      }),
    }));
    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue({
        get: vi.fn().mockResolvedValue(null),
        run: runMock,
        all: vi.fn().mockResolvedValue([]),
      }),
    }));
    vi.doMock("@/lib/onboardingEmail", () => ({
      getPublicAppUrl: vi.fn(() => "https://devlens.test"),
      getApiBaseUrl: vi.fn(() => "https://devlens.test/v1"),
      sendDeveloperOnboardingEmail,
    }));
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_xxx");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "inv_001", url: "https://clerk.test/invite" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/team/members/route.js");
    const req = new Request("https://devlens.test/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body.success).toBe(true);
    expect(body.invited).toBe("test@example.com");
    expect(body.apiBaseUrl).toBe("https://devlens.test/v1");
    expect(body.signInUrl).toBe("https://clerk.test/invite");
    expect(body.apiKey).toBeDefined();
    expect(body.apiKey.name).toBe("Initial Developer Key");
    expect(body.apiKey.key).toBe(`dvl_${MOCK_KEY}`);
    expect(runMock).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.arrayContaining(["test@example.com", "team-a", "inv_001"])
    );
    expect(sendDeveloperOnboardingEmail).toHaveBeenCalledWith(expect.objectContaining({
      signInUrl: "https://clerk.test/invite",
      apiBaseUrl: "https://devlens.test/v1",
    }));
  });

  it("POST invite reuses existing member and initial api key on retry", async () => {
    vi.resetModules();
    const runMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/auth", () => ({
      requireManagerContext: vi.fn().mockResolvedValue({
        teamId: "team-a",
        clerkOrgId: "org-a",
      }),
    }));
    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue({
        get: vi.fn()
          .mockResolvedValueOnce({ name: "My Team" })
          .mockResolvedValueOnce({ id: "existing-user" })
          .mockResolvedValueOnce({ id: "existing-key" }),
        run: runMock,
        all: vi.fn().mockResolvedValue([]),
      }),
    }));
    vi.doMock("@/lib/onboardingEmail", () => ({
      getPublicAppUrl: vi.fn(() => "https://devlens.test"),
      getApiBaseUrl: vi.fn(() => "https://devlens.test/v1"),
      sendDeveloperOnboardingEmail: vi.fn().mockResolvedValue({ status: "skipped" }),
    }));
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_xxx");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "inv_002" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/team/members/route.js");
    const req = new Request("https://devlens.test/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body.apiKey.id).toBe("existing-key");
    expect(body.apiKey.key).toBeUndefined();
    expect(body.invited).toBe("test@example.com");
  });

  it("POST invite returns BAD GATEWAY when onboarding email fails", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth", () => ({
      requireManagerContext: vi.fn().mockResolvedValue({
        teamId: "team-a",
        clerkOrgId: "org-a",
      }),
    }));
    const runMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue({
        get: vi.fn().mockResolvedValue(null),
        run: runMock,
        all: vi.fn().mockResolvedValue([]),
      }),
    }));
    vi.doMock("@/lib/onboardingEmail", () => ({
      getPublicAppUrl: vi.fn(() => "https://devlens.test"),
      getApiBaseUrl: vi.fn(() => "https://devlens.test/v1"),
      sendDeveloperOnboardingEmail: vi.fn().mockRejectedValue(new Error("SMTP connection refused")),
    }));
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_xxx");

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "inv_003" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const { POST } = await import("@/app/api/team/members/route.js");
    const req = new Request("https://devlens.test/api/team/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toBe("SMTP connection refused");
  });
});

describe("manager sidebar", () => {
  it("does not show standalone API Keys nav for managers", () => {
    vi.resetModules();
    const fs = require("node:fs");
    const path = require("node:path");
    const sidebar = fs.readFileSync(
      path.resolve(__dirname, "../../src/shared/components/Sidebar.js"),
      "utf8"
    );
    expect(sidebar).toContain('.label !== "API Keys"');
  });
});

describe("manager keys page redirect", () => {
  it("redirects managers away from /dashboard/keys", () => {
    vi.resetModules();
    const fs = require("node:fs");
    const path = require("node:path");
    const page = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(dashboard)/dashboard/keys/page.js"),
      "utf8"
    );
    expect(page).toContain('window.location.replace("/dashboard/team")');
  });
});

describe("developer invite onboarding status", () => {
  it("marks Clerk membership invite as onboarded", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const webhook = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/api/auth/clerk-webhook/route.js"),
      "utf8"
    );
    expect(webhook).toContain("inviteStatus = 'onboarded'");
  });

  it("normalizes legacy invite statuses", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const migration = fs.readFileSync(
      path.resolve(__dirname, "../../src/lib/db/migrations/005-developer-invite-status-normalization.js"),
      "utf8"
    );
    expect(migration).toContain("inviteStatus = 'pending'");
    expect(migration).toContain("inviteStatus = 'onboarded'");
  });
});

describe("developer and manager copy UI", () => {
  it("shows developer API base URL and copy guidance", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const page = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(dashboard)/dashboard/keys/page.js"),
      "utf8"
    );
    expect(page).toContain("API Base URL");
    expect(page).toContain("api-base-url");
    expect(page).toContain("Full API Key plaintext appears only when created or rotated");
  });

  it("shows manager copy controls for assigned key display", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const page = fs.readFileSync(
      path.resolve(__dirname, "../../src/app/(dashboard)/dashboard/team/page.js"),
      "utf8"
    );
    expect(page).toContain("new-key");
    expect(page).toContain("Copy ID");
    expect(page).toContain("onboarded");
  });
});
