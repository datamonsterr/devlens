import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

let tempDir;
let db;
let originalDataDir;
let originalVercel;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "devlens-integration-"));
  originalDataDir = process.env.DATA_DIR;
  originalVercel = process.env.VERCEL;
  delete process.env.VERCEL;
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("DB integration — team-scoped data", () => {
  const TEAM_1 = "team-001";
  const TEAM_2 = "team-002";
  const USER_MGR = "user-mgr-001";
  const USER_DEV_1 = "user-dev-001";
  const USER_DEV_2 = "user-dev-002";

  beforeAll(async () => {
    const adapter = await (await import("@/lib/db/driver")).getAdapter();
    const now = new Date().toISOString();

    await adapter.run(
      `INSERT INTO teams(id, name, clerkOrgId, rtkPool, createdAt, updatedAt) VALUES(?, ?, ?, 0, ?, ?)`,
      [TEAM_1, "Test Team Alpha", "clerk_org_alpha", now, now]
    );
    await adapter.run(
      `INSERT INTO teams(id, name, clerkOrgId, rtkPool, createdAt, updatedAt) VALUES(?, ?, ?, 0, ?, ?)`,
      [TEAM_2, "Test Team Beta", "clerk_org_beta", now, now]
    );

    await adapter.run(
      `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
      [USER_MGR, "clerk_mgr_alpha", TEAM_1, "manager", now, now]
    );
    await adapter.run(
      `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
      [USER_DEV_1, "clerk_dev_alpha", TEAM_1, "developer", now, now]
    );
    await adapter.run(
      `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
      [USER_DEV_2, "clerk_dev_beta", TEAM_2, "developer", now, now]
    );
  });

  describe("providerConnections — team scoping", () => {
    it("scopes connections by teamId", async () => {
      const c1 = await db.createProviderConnection({
        teamId: TEAM_1,
        provider: "openai",
        authType: "apikey",
        name: "Team1-OpenAI",
        apiKey: "sk-team1",
      });
      const c2 = await db.createProviderConnection({
        teamId: TEAM_2,
        provider: "openai",
        authType: "apikey",
        name: "Team2-OpenAI",
        apiKey: "sk-team2",
      });

      const team1Conns = await db.getProviderConnections({ teamId: TEAM_1 });
      expect(team1Conns.some((c) => c.id === c1.id)).toBe(true);
      expect(team1Conns.some((c) => c.id === c2.id)).toBe(false);

      const team2Conns = await db.getProviderConnections({ teamId: TEAM_2 });
      expect(team2Conns.some((c) => c.id === c2.id)).toBe(true);
      expect(team2Conns.some((c) => c.id === c1.id)).toBe(false);
    });

    it("getProviderConnectionById scoped by teamId", async () => {
      const c = await db.createProviderConnection({
        teamId: TEAM_1,
        provider: "anthropic",
        authType: "apikey",
        name: "Claude-T1",
        apiKey: "sk-claude",
      });

      const found = await db.getProviderConnectionById(c.id, TEAM_1);
      expect(found).toBeDefined();
      expect(found.name).toBe("Claude-T1");

      const notFound = await db.getProviderConnectionById(c.id, TEAM_2);
      expect(notFound).toBeNull();
    });

    it("stores providerSpecificData for openai-compatible nodes", async () => {
      const node = await db.createProviderNode({
        type: "openai-compatible",
        name: "9router",
        prefix: "9r",
        apiType: "openai",
        baseUrl: "http://127.0.0.1:20128/v1",
      });

      const conn = await db.createProviderConnection({
        teamId: TEAM_1,
        provider: node.id,
        authType: "apikey",
        name: "9router-Tunnel",
        apiKey: "sk-dd28b2b1ca75d61d",
        providerSpecificData: {
          prefix: node.prefix,
          apiType: node.apiType,
          baseUrl: node.baseUrl,
          nodeName: node.name,
        },
      });

      expect(conn.provider).toBe(node.id);
      expect(conn.providerSpecificData.baseUrl).toBe("http://127.0.0.1:20128/v1");
      expect(conn.providerSpecificData.apiType).toBe("openai");
    });
  });

  describe("providerNodes", () => {
    it("creates and queries openai-compatible nodes", async () => {
      const node = await db.createProviderNode({
        type: "openai-compatible",
        name: "Local LLM",
        prefix: "local",
        apiType: "openai",
        baseUrl: "http://localhost:8080/v1",
      });

      expect(node.id).toBeDefined();
      expect(node.type).toBe("openai-compatible");

      const all = await db.getProviderNodes({ type: "openai-compatible" });
      expect(all.some((n) => n.id === node.id)).toBe(true);
    });

    it("updates node fields", async () => {
      const node = await db.createProviderNode({
        type: "openai-compatible",
        name: "Temp Node",
        prefix: "tmp",
        apiType: "openai",
        baseUrl: "http://temp/v1",
      });

      await db.updateProviderNode(node.id, { name: "Updated Node", baseUrl: "http://updated/v1" });
      const updated = await db.getProviderNodeById(node.id);
      expect(updated.name).toBe("Updated Node");
      expect(updated.baseUrl).toBe("http://updated/v1");
    });
  });

  describe("combos — team scoping", () => {
    it("scopes combos by teamId", async () => {
      const c1 = await db.createCombo({
        teamId: TEAM_1,
        name: "t1-combo",
        models: ["openai/gpt-4o", "anthropic/claude-sonnet"],
      });
      const c2 = await db.createCombo({
        teamId: TEAM_2,
        name: "t2-combo",
        models: ["openai/gpt-4o-mini"],
      });

      const t1Combos = await db.getCombos(TEAM_1);
      expect(t1Combos.some((c) => c.id === c1.id)).toBe(true);
      expect(t1Combos.some((c) => c.id === c2.id)).toBe(false);

      const t2Combos = await db.getCombos(TEAM_2);
      expect(t2Combos.some((c) => c.id === c2.id)).toBe(true);
      expect(t2Combos.some((c) => c.id === c1.id)).toBe(false);
    });

    it("getComboByName is team-scoped", async () => {
      await db.createCombo({
        teamId: TEAM_1,
        name: "shared-name",
        models: ["m1"],
      });

      const found = await db.getComboByName("shared-name", TEAM_1);
      expect(found).toBeDefined();

      const notFound = await db.getComboByName("shared-name", TEAM_2);
      expect(notFound).toBeNull();
    });

    it("stores models as JSON array and retrieves correctly", async () => {
      const models = ["openai/gpt-4o", "openai/gpt-4o-mini", "9r/SuperBrain"];
      const c = await db.createCombo({
        teamId: TEAM_1,
        name: "json-test",
        models,
      });

      const fetched = await db.getComboById(c.id, TEAM_1);
      expect(fetched.models).toEqual(models);
    });
  });

  describe("apiKeys — team scoping and hashing", () => {
    let hashApiKey, generateApiKey, verifyApiKey;

    beforeAll(async () => {
      const utils = await import("@/lib/apiKeyUtils");
      hashApiKey = utils.hashApiKey;
      generateApiKey = utils.generateApiKey;
      verifyApiKey = utils.verifyApiKey;

      const driver = await import("@/lib/db/driver");
      const adapter = await driver.getAdapter();
      await adapter.run(
        `INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, 5, '{}') ON CONFLICT(teamId) DO NOTHING`,
        [TEAM_1]
      );
      await adapter.run(
        `INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, 3, '{}') ON CONFLICT(teamId) DO NOTHING`,
        [TEAM_2]
      );
    });

    it("generates and stores API key with hash", async () => {
      const keyValue = generateApiKey();
      const keyHash = hashApiKey(keyValue);
      const driver = await import("@/lib/db/driver");
      const adapter = await driver.getAdapter();

      const keyId = require("uuid").v4();
      const now = new Date().toISOString();

      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [keyId, keyHash, "cli-key", TEAM_1, USER_DEV_1, now]
      );

      const stored = await adapter.get(
        `SELECT keyHash FROM apiKeys WHERE id = ?`,
        [keyId]
      );
      expect(verifyApiKey(keyValue, stored.keyHash)).toBe(true);
    });

    it("team scoping: queries only team keys for manager", async () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const driver = await import("@/lib/db/driver");
      const adapter = await driver.getAdapter();
      const { v4 } = await import("uuid");
      const now = new Date().toISOString();

      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [v4(), hashApiKey(key1), "t1-key", TEAM_1, USER_DEV_1, now]
      );
      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [v4(), hashApiKey(key2), "t2-key", TEAM_2, USER_DEV_2, now]
      );

      const t1Keys = await adapter.all(
        `SELECT id, name FROM apiKeys WHERE teamId = ? AND isActive = 1`,
        [TEAM_1]
      );
      expect(t1Keys.some((k) => k.name === "t1-key")).toBe(true);
      expect(t1Keys.every((k) => k.name !== "t2-key")).toBe(true);
    });

    it("developer sees only their own keys", async () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      const driver = await import("@/lib/db/driver");
      const adapter = await driver.getAdapter();
      const { v4 } = await import("uuid");
      const now = new Date().toISOString();

      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [v4(), hashApiKey(key1), "dev-key", TEAM_1, USER_DEV_1, now]
      );
      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)`,
        [v4(), hashApiKey(key2), "other-dev-key", TEAM_1, USER_MGR, now]
      );

      const devKeys = await adapter.all(
        `SELECT id, name FROM apiKeys WHERE userId = ? AND isActive = 1`,
        [USER_DEV_1]
      );
      expect(devKeys.some((k) => k.name === "dev-key")).toBe(true);
      expect(devKeys.every((k) => k.name !== "other-dev-key")).toBe(true);
    });
  });

  describe("auditLog", () => {
    it("writes and reads audit log entries team-scoped", async () => {
      await db.writeAuditLog({
        teamId: TEAM_1,
        actorId: USER_MGR,
        actorRole: "manager",
        action: "create",
        resource: "providerConnection",
        resourceId: "conn-123",
        payload: { provider: "openai" },
      });

      const logs = await db.getAuditLog(TEAM_1, { limit: 10 });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toBe("create");
      expect(logs[0].resource).toBe("providerConnection");
    });
  });

  describe("pricingOverrides — team scoping", () => {
    it("stores per-team per-model pricing", async () => {
      const driver = await import("@/lib/db/driver");
      const adapter = await driver.getAdapter();
      const now = new Date().toISOString();

      await adapter.run(
        `INSERT INTO pricingOverrides(teamId, model, inputPrice, outputPrice, source, createdAt, updatedAt) VALUES(?, ?, ?, ?, 'manual', ?, ?)`,
        [TEAM_1, "gpt-4o", 0.00001, 0.00003, now, now]
      );

      await adapter.run(
        `INSERT INTO pricingOverrides(teamId, model, inputPrice, outputPrice, source, createdAt, updatedAt) VALUES(?, ?, ?, ?, 'manual', ?, ?)`,
        [TEAM_2, "gpt-4o", 0.00002, 0.00006, now, now]
      );

      const t1Price = await adapter.get(
        `SELECT inputPrice, outputPrice FROM pricingOverrides WHERE teamId = ? AND model = ?`,
        [TEAM_1, "gpt-4o"]
      );
      expect(t1Price.inputPrice).toBe(0.00001);

      const t2Price = await adapter.get(
        `SELECT inputPrice, outputPrice FROM pricingOverrides WHERE teamId = ? AND model = ?`,
        [TEAM_2, "gpt-4o"]
      );
      expect(t2Price.inputPrice).toBe(0.00002);
    });
  });
});
