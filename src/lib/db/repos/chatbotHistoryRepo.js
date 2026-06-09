import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";

const SCOPE = "chatbotHistory";
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

export async function appendChatbotMessages(newMessages) {
  const history = await getChatbotHistory();
  const updated = [...history, ...newMessages];

  const MAX_HISTORY = 200;
  const trimmed = updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;

  await saveChatbotHistory(trimmed);
  return trimmed;
}
