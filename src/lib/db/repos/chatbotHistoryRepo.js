import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const SCOPE = "chatbotHistory";
// We use a single key "history" to store the array of messages for now,
// or we can use keys as session IDs if we want multiple threads.
// For simplicity, let's keep one thread per team.
const KEY = "thread"; 

export async function getChatbotHistory() {
  const db = await getAdapter();
  const row = await db.get(`SELECT value FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
  return row ? parseJson(row.value, []) : [];
}

export async function saveChatbotHistory(messages) {
  const db = await getAdapter();
  await db.run(
    `INSERT INTO kv(scope, key, value) VALUES(?, ?, ?) 
     ON CONFLICT(scope, key) DO UPDATE SET value = excluded.value`,
    [SCOPE, KEY, stringifyJson(messages)]
  );
  return messages;
}

export async function clearChatbotHistory() {
  const db = await getAdapter();
  await db.run(`DELETE FROM kv WHERE scope = ? AND key = ?`, [SCOPE, KEY]);
}
