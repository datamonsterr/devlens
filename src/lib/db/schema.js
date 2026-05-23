// Latest schema version — bumped when a migration is added in ./migrations/
export const SCHEMA_VERSION = 2;

export const PRAGMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA mmap_size = 30000000;
PRAGMA cache_size = -64000;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
`;

// Declarative current schema. Used by syncSchemaFromTables() to
// auto-add missing tables/columns/indexes after versioned migrations.
// For destructive changes (drop/rename/type-change), write a migration file.
export const TABLES = {
  _meta: {
    columns: {
      key: "TEXT PRIMARY KEY",
      value: "TEXT NOT NULL",
    },
  },
  settings: {
    columns: {
      id: "INTEGER PRIMARY KEY CHECK (id = 1)",
      data: "TEXT NOT NULL",
    },
  },
  providerConnections: {
    columns: {
      id: "TEXT PRIMARY KEY",
      teamId: "TEXT REFERENCES teams(id)",
      provider: "TEXT NOT NULL",
      authType: "TEXT NOT NULL",
      name: "TEXT",
      email: "TEXT",
      priority: "INTEGER",
      isActive: "INTEGER DEFAULT 1",
      data: "TEXT NOT NULL",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_pc_provider ON providerConnections(provider)",
      "CREATE INDEX IF NOT EXISTS idx_pc_provider_active ON providerConnections(provider, isActive)",
      "CREATE INDEX IF NOT EXISTS idx_pc_priority ON providerConnections(provider, priority)",
    ],
  },
  providerNodes: {
    columns: {
      id: "TEXT PRIMARY KEY",
      type: "TEXT",
      name: "TEXT",
      data: "TEXT NOT NULL",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: ["CREATE INDEX IF NOT EXISTS idx_pn_type ON providerNodes(type)"],
  },
  proxyPools: {
    columns: {
      id: "TEXT PRIMARY KEY",
      isActive: "INTEGER DEFAULT 1",
      testStatus: "TEXT",
      data: "TEXT NOT NULL",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_pp_active ON proxyPools(isActive)",
      "CREATE INDEX IF NOT EXISTS idx_pp_status ON proxyPools(testStatus)",
    ],
  },
  apiKeys: {
    columns: {
      id: "TEXT PRIMARY KEY",
      keyHash: "TEXT UNIQUE",
      key: "TEXT UNIQUE",
      name: "TEXT",
      teamId: "TEXT REFERENCES teams(id)",
      userId: "TEXT REFERENCES users(id)",
      machineId: "TEXT",
      isActive: "INTEGER DEFAULT 1",
      lastUsedAt: "TEXT",
      createdAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_ak_key ON apiKeys(key)",
      "CREATE INDEX IF NOT EXISTS idx_ak_hash ON apiKeys(keyHash)",
      "CREATE INDEX IF NOT EXISTS idx_ak_user ON apiKeys(userId)",
      "CREATE INDEX IF NOT EXISTS idx_ak_team ON apiKeys(teamId)",
    ],
  },
  combos: {
    columns: {
      id: "TEXT PRIMARY KEY",
      teamId: "TEXT REFERENCES teams(id)",
      name: "TEXT UNIQUE NOT NULL",
      kind: "TEXT",
      models: "TEXT NOT NULL",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: ["CREATE INDEX IF NOT EXISTS idx_combo_name ON combos(name)"],
  },
  kv: {
    columns: {
      scope: "TEXT NOT NULL",
      key: "TEXT NOT NULL",
      value: "TEXT NOT NULL",
    },
    primaryKey: "PRIMARY KEY (scope, key)",
    indexes: ["CREATE INDEX IF NOT EXISTS idx_kv_scope ON kv(scope)"],
  },
  usageHistory: {
    columns: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      timestamp: "TEXT NOT NULL",
      teamId: "TEXT REFERENCES teams(id)",
      userId: "TEXT REFERENCES users(id)",
      provider: "TEXT",
      model: "TEXT",
      connectionId: "TEXT",
      apiKey: "TEXT",
      endpoint: "TEXT",
      promptTokens: "INTEGER DEFAULT 0",
      completionTokens: "INTEGER DEFAULT 0",
      rtkTokensSaved: "INTEGER DEFAULT 0",
      cost: "REAL DEFAULT 0",
      status: "TEXT",
      tokens: "TEXT",
      meta: "TEXT",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_uh_ts ON usageHistory(timestamp DESC)",
      "CREATE INDEX IF NOT EXISTS idx_uh_team ON usageHistory(teamId)",
      "CREATE INDEX IF NOT EXISTS idx_uh_user ON usageHistory(userId)",
      "CREATE INDEX IF NOT EXISTS idx_uh_provider ON usageHistory(provider)",
      "CREATE INDEX IF NOT EXISTS idx_uh_model ON usageHistory(model)",
      "CREATE INDEX IF NOT EXISTS idx_uh_conn ON usageHistory(connectionId)",
    ],
  },
  usageDaily: {
    columns: {
      dateKey: "TEXT PRIMARY KEY",
      data: "TEXT NOT NULL",
    },
  },
  // ── Multi-tenant tables ─────────────────────────────────────────────
  teams: {
    columns: {
      id: "TEXT PRIMARY KEY",
      name: "TEXT NOT NULL",
      clerkOrgId: "TEXT UNIQUE NOT NULL",
      rtkPool: "INTEGER DEFAULT 0",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_teams_clerk ON teams(clerkOrgId)",
    ],
  },
  users: {
    columns: {
      id: "TEXT PRIMARY KEY",
      clerkUserId: "TEXT UNIQUE NOT NULL",
      teamId: "TEXT REFERENCES teams(id)",
      role: "TEXT NOT NULL CHECK(role IN ('manager', 'developer'))",
      isActive: "INTEGER DEFAULT 1",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_users_clerk ON users(clerkUserId)",
      "CREATE INDEX IF NOT EXISTS idx_users_team ON users(teamId)",
    ],
  },
  rtkPoolHistory: {
    columns: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      teamId: "TEXT NOT NULL REFERENCES teams(id)",
      action: "TEXT NOT NULL CHECK(action IN ('allocate', 'consume', 'reset'))",
      amount: "INTEGER NOT NULL",
      remainingAfter: "INTEGER NOT NULL",
      timestamp: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_rtkh_team ON rtkPoolHistory(teamId)",
      "CREATE INDEX IF NOT EXISTS idx_rtkh_ts ON rtkPoolHistory(timestamp DESC)",
    ],
  },
  pricingOverrides: {
    columns: {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      teamId: "TEXT NOT NULL REFERENCES teams(id)",
      model: "TEXT NOT NULL",
      inputPrice: "REAL",
      outputPrice: "REAL",
      source: "TEXT DEFAULT 'manual' CHECK(source IN ('auto', 'manual'))",
      createdAt: "TEXT NOT NULL",
      updatedAt: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_pricing_team_model ON pricingOverrides(teamId, model)",
    ],
  },
  teamSettings: {
    columns: {
      teamId: "TEXT PRIMARY KEY REFERENCES teams(id)",
      maxKeysPerDeveloper: "INTEGER DEFAULT 5",
      data: "TEXT NOT NULL DEFAULT '{}'",
    },
  },
  requestDetails: {
    columns: {
      id: "TEXT PRIMARY KEY",
      timestamp: "TEXT NOT NULL",
      provider: "TEXT",
      model: "TEXT",
      connectionId: "TEXT",
      status: "TEXT",
      data: "TEXT NOT NULL",
    },
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_rd_ts ON requestDetails(timestamp DESC)",
      "CREATE INDEX IF NOT EXISTS idx_rd_provider ON requestDetails(provider)",
      "CREATE INDEX IF NOT EXISTS idx_rd_model ON requestDetails(model)",
      "CREATE INDEX IF NOT EXISTS idx_rd_conn ON requestDetails(connectionId)",
    ],
  },
};

export function buildCreateTableSql(name, def) {
  const cols = Object.entries(def.columns).map(([k, v]) => `${k} ${v}`);
  if (def.primaryKey) cols.push(def.primaryKey);
  return `CREATE TABLE IF NOT EXISTS ${name} (${cols.join(", ")})`;
}
