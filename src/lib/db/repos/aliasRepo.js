import { getAdapter } from "../driver.js";
import { parseJson, stringifyJson } from "../helpers/jsonCol.js";
import { makeKv } from "../helpers/kvStore.js";

const aliasKv = makeKv("modelAliases");
const customKv = makeKv("customModels");
const mitmKv = makeKv("mitmAlias");

function teamKey(teamId, key) {
  return teamId ? `${teamId}:${key}` : key;
}

function stripTeamAliases(rows, teamId) {
  if (!teamId) return rows;
  const prefix = `${teamId}:`;
  return Object.fromEntries(
    Object.entries(rows)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value])
  );
}

// modelAliases: key=alias, value=modelString
export async function getModelAliases(teamId) {
  return stripTeamAliases(await aliasKv.getAll(), teamId);
}

export async function setModelAlias(alias, model, teamId) {
  await aliasKv.set(teamKey(teamId, alias), model);
}

export async function deleteModelAlias(alias, teamId) {
  await aliasKv.remove(teamKey(teamId, alias));
}

// customModels: key=`${providerAlias}|${id}|${type}`, value=full model object
function customKey(providerAlias, id, type) {
  return `${providerAlias}|${id}|${type}`;
}

export async function getCustomModels(teamId) {
  const all = await customKv.getAll();
  if (!teamId) return Object.values(all);
  const prefix = `${teamId}:`;
  return Object.entries(all)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value);
}

// Atomic check-then-insert inside transaction to prevent duplicate races
export async function addCustomModel({ teamId, providerAlias, id, type = "llm", name }) {
  const k = teamKey(teamId, customKey(providerAlias, id, type));
  const db = await getAdapter();
  let added = false;
  db.transaction(() => {
    const row = db.get(`SELECT 1 FROM kv WHERE scope = 'customModels' AND key = ?`, [k]);
    if (row) return;
    const value = stringifyJson({ providerAlias, id, type, name: name || id });
    db.run(`INSERT INTO kv(scope, key, value) VALUES('customModels', ?, ?)`, [k, value]);
    added = true;
  });
  return added;
}

export async function deleteCustomModel({ teamId, providerAlias, id, type = "llm" }) {
  await customKv.remove(teamKey(teamId, customKey(providerAlias, id, type)));
}

// mitmAlias: key=toolName, value=mappings object
export async function getMitmAlias(toolName) {
  if (toolName) {
    const v = await mitmKv.get(toolName);
    return v || {};
  }
  return await mitmKv.getAll();
}

export async function setMitmAliasAll(toolName, mappings) {
  await mitmKv.set(toolName, mappings || {});
}
