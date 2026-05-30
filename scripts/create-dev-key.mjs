import { getAdapter } from "../src/lib/db/driver.js";
import { generateApiKey, hashApiKey } from "../src/lib/apiKeyUtils.js";
import { v4 as uuidv4 } from "uuid";

const adapter = await getAdapter();
const now = new Date().toISOString();

const team = await adapter.get("SELECT id FROM teams WHERE clerkOrgId = ?", ["local-dev"]);
if (!team) { console.error("No local-dev team"); process.exit(1); }

let devUser = await adapter.get(
  "SELECT id FROM users WHERE teamId = ? AND role = 'developer'",
  [team.id]
);

if (!devUser) {
  devUser = { id: uuidv4() };
  await adapter.run(
    "INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, 'developer', 1, ?, ?)",
    [devUser.id, "local-dev-developer", team.id, now, now]
  );
  console.log("Created dev user:", devUser.id);

  await adapter.run(
    "INSERT INTO teamSettings(teamId, maxKeysPerDeveloper, data) VALUES(?, 10, '{}') ON CONFLICT(teamId) DO NOTHING",
    [team.id]
  );
} else {
  console.log("Found dev user:", devUser.id);
}

const keyValue = generateApiKey();
const keyHash = hashApiKey(keyValue);
const keyId = uuidv4();

await adapter.run(
  "INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, ?, ?, ?, 1, ?)",
  [keyId, keyHash, "cli-test-key", team.id, devUser.id, now]
);

console.log("API_KEY:" + keyValue);
console.log("TEAM_ID:" + team.id);
console.log("USER_ID:" + devUser.id);
