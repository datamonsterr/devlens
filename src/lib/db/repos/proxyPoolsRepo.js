import { v4 as uuidv4 } from "uuid";
import { getAdapter } from "../driver.js";

function rowToProxyPool(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    proxyUrl: row.proxyUrl,
    isActive: row.isActive === 1 || row.isActive === true,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getProxyPools() {
  const db = await getAdapter();
  return db.all(`SELECT * FROM proxyPools ORDER BY updatedAt DESC`).map(rowToProxyPool);
}

export async function createProxyPool(data) {
  const db = await getAdapter();
  const now = new Date().toISOString();
  const pool = { id: uuidv4(), name: data.name, proxyUrl: data.proxyUrl, isActive: data.isActive !== false, createdAt: now, updatedAt: now };
  db.run(
    `INSERT INTO proxyPools(id, name, proxyUrl, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, ?, ?)`,
    [pool.id, pool.name, pool.proxyUrl, pool.isActive ? 1 : 0, pool.createdAt, pool.updatedAt]
  );
  return pool;
}

export async function updateProxyPool(id, data) {
  const db = await getAdapter();
  const existing = rowToProxyPool(db.get(`SELECT * FROM proxyPools WHERE id = ?`, [id]));
  if (!existing) return null;
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  db.run(
    `UPDATE proxyPools SET name = ?, proxyUrl = ?, isActive = ?, updatedAt = ? WHERE id = ?`,
    [merged.name, merged.proxyUrl, merged.isActive ? 1 : 0, merged.updatedAt, id]
  );
  return merged;
}

export async function deleteProxyPool(id) {
  const db = await getAdapter();
  const res = db.run(`DELETE FROM proxyPools WHERE id = ?`, [id]);
  return (res?.changes ?? 0) > 0;
}
