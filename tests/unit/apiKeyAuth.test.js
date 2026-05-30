import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashApiKey } from "@/lib/apiKeyUtils";

describe("authenticateApiKey", () => {
  let authenticateApiKey;
  let mockAdapter;

  beforeEach(async () => {
    vi.resetModules();

    mockAdapter = {
      all: vi.fn(),
      get: vi.fn(),
      run: vi.fn(),
    };

    vi.doMock("@/lib/db/driver", () => ({
      getAdapter: vi.fn().mockResolvedValue(mockAdapter),
    }));

    const mod = await import("@/lib/apiKeyAuth");
    authenticateApiKey = mod.authenticateApiKey;
  });

  function makeRequest(headerValue) {
    const headers = new Headers();
    if (headerValue) headers.set("Authorization", headerValue);
    return new Request("https://test.local/api/v1/chat/completions", { headers });
  }

  it("returns 401 when no Authorization header", async () => {
    const req = makeRequest(null);
    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("returns 401 when Authorization does not start with Bearer", async () => {
    const req = makeRequest("Basic dGVzdA==");
    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("returns 401 when empty Bearer token", async () => {
    const req = makeRequest("Bearer ");
    mockAdapter.all.mockResolvedValue([]);
    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("returns 401 when no active keys exist", async () => {
    const req = makeRequest("Bearer dvl_some-key");
    mockAdapter.all.mockResolvedValue([]);
    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("returns 401 when key does not match any hash", async () => {
    const req = makeRequest("Bearer dvl_unknown-key");
    const storedKey = "dvl_stored-key";
    mockAdapter.all.mockResolvedValue([
      {
        id: "key-1",
        keyHash: hashApiKey(storedKey),
        userId: "user-1",
        teamId: "team-1",
        isActive: 1,
      },
    ]);
    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("authenticates valid API key and returns context", async () => {
    const plaintext = "dvl_valid-test-key-789";
    const keyHash = hashApiKey(plaintext);
    const req = makeRequest(`Bearer ${plaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-42",
        keyHash,
        userId: "user-42",
        teamId: "team-42",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue({
      id: "user-42",
      clerkUserId: "clerk_xxx",
      role: "developer",
    });

    mockAdapter.run.mockResolvedValue({ changes: 1 });

    const result = await authenticateApiKey(req);
    expect(result.error).toBeUndefined();
    expect(result.apiKeyId).toBe("key-42");
    expect(result.userId).toBe("user-42");
    expect(result.teamId).toBe("team-42");
    expect(result.role).toBe("developer");
  });

  it("returns 401 when user is deactivated", async () => {
    const plaintext = "dvl_deactivated-user-key";
    const req = makeRequest(`Bearer ${plaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-1",
        keyHash: hashApiKey(plaintext),
        userId: "user-dead",
        teamId: "team-1",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue(null);

    const result = await authenticateApiKey(req);
    expect(result.error).toBeDefined();
    expect(result.error.status).toBe(401);
  });

  it("matches among multiple active keys", async () => {
    const targetPlaintext = "dvl_third-key";
    const req = makeRequest(`Bearer ${targetPlaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-1",
        keyHash: hashApiKey("dvl_first-key"),
        userId: "user-1",
        teamId: "team-1",
        isActive: 1,
      },
      {
        id: "key-2",
        keyHash: hashApiKey("dvl_second-key"),
        userId: "user-2",
        teamId: "team-2",
        isActive: 1,
      },
      {
        id: "key-3",
        keyHash: hashApiKey(targetPlaintext),
        userId: "user-3",
        teamId: "team-3",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue({
      id: "user-3",
      clerkUserId: "clerk_3",
      role: "developer",
    });

    mockAdapter.run.mockResolvedValue({ changes: 1 });

    const result = await authenticateApiKey(req);
    expect(result.apiKeyId).toBe("key-3");
    expect(result.userId).toBe("user-3");
    expect(result.teamId).toBe("team-3");
  });

  it("skips keys without keyHash", async () => {
    const plaintext = "dvl_hashed-key";
    const req = makeRequest(`Bearer ${plaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-legacy",
        keyHash: null,
        userId: "user-legacy",
        teamId: "team-legacy",
        isActive: 1,
      },
      {
        id: "key-hashed",
        keyHash: hashApiKey(plaintext),
        userId: "user-hashed",
        teamId: "team-hashed",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue({
      id: "user-hashed",
      clerkUserId: "clerk_h",
      role: "developer",
    });

    mockAdapter.run.mockResolvedValue({ changes: 1 });

    const result = await authenticateApiKey(req);
    expect(result.apiKeyId).toBe("key-hashed");
  });

  it("updates lastUsedAt on successful auth", async () => {
    const plaintext = "dvl_timestamp-test";
    const req = makeRequest(`Bearer ${plaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-ts",
        keyHash: hashApiKey(plaintext),
        userId: "user-ts",
        teamId: "team-ts",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue({
      id: "user-ts",
      clerkUserId: "clerk_ts",
      role: "developer",
    });

    mockAdapter.run.mockResolvedValue({ changes: 1 });

    await authenticateApiKey(req);
    expect(mockAdapter.run).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE apiKeys SET lastUsedAt"),
      expect.arrayContaining(["key-ts"])
    );
  });

  it("survives lastUsedAt update failure gracefully", async () => {
    const plaintext = "dvl_robust-key";
    const req = makeRequest(`Bearer ${plaintext}`);

    mockAdapter.all.mockResolvedValue([
      {
        id: "key-rob",
        keyHash: hashApiKey(plaintext),
        userId: "user-rob",
        teamId: "team-rob",
        isActive: 1,
      },
    ]);

    mockAdapter.get.mockResolvedValue({
      id: "user-rob",
      clerkUserId: "clerk_rob",
      role: "developer",
    });

    mockAdapter.run.mockRejectedValue(new Error("DB write failed"));

    const result = await authenticateApiKey(req);
    expect(result.error).toBeUndefined();
    expect(result.apiKeyId).toBe("key-rob");
  });
});
