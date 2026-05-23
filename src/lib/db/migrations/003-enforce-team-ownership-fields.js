export default {
  version: 3,
  name: "enforce-team-ownership-fields",
  async up(db) {
    try {
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_combo_team_name ON combos(teamId, name)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_team ON providerConnections(teamId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider_team_active ON providerConnections(provider, teamId, isActive)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_uh_team_user_ts ON usageHistory(teamId, userId, timestamp DESC)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_ak_team_user ON apiKeys(teamId, userId)`);
    } catch (e) {
      console.warn(`[DB][migrate] team ownership indexes: ${e.message}`);
    }
  },
};
