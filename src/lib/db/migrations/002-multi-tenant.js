export default {
  version: 2,
  name: "add-multi-tenant-tables-and-columns",
  async up(db) {
    // New tables are auto-created via syncSchemaFromTables (TABLES declaration).
    // This migration handles destructive changes that auto-sync cannot:

    // 1. Drop old UNIQUE constraint on combos.name — different teams can have
    //    combos with the same name. New unique constraint is on (teamId, name)
    try {
      await db.exec(`DROP INDEX IF EXISTS idx_combo_name`);
      await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_combo_team_name ON combos(teamId, name)`);
    } catch (e) {
      console.warn(`[DB][migrate] combo index update: ${e.message}`);
    }

    // 2. Drop old providerConnections indexes that don't include team_id
    try {
      await db.exec(`DROP INDEX IF EXISTS idx_pc_provider`);
      await db.exec(`DROP INDEX IF EXISTS idx_pc_provider_active`);
      await db.exec(`DROP INDEX IF EXISTS idx_pc_priority`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_team ON providerConnections(teamId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider ON providerConnections(provider, teamId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_pc_provider_active ON providerConnections(provider, isActive, teamId)`);
    } catch (e) {
      console.warn(`[DB][migrate] providerConnections indexes: ${e.message}`);
    }
  },
};
