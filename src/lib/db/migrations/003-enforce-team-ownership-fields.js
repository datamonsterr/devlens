export default {
  version: 3,
  name: "enforce-team-ownership-fields",
  up(db) {
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_combo_team_name ON combos(teamId, name)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_team ON providerConnections(teamId)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider_team_active ON providerConnections(provider, teamId, isActive)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_uh_team_user_ts ON usageHistory(teamId, userId, timestamp DESC)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_ak_team_user ON apiKeys(teamId, userId)`);
    } catch (e) {
      console.warn(`[DB][migrate] team ownership indexes: ${e.message}`);
    }
  },
};
