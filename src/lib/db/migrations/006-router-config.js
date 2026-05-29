export default {
  version: 6,
  name: "router-config",
  async up(db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS auditLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teamId TEXT NOT NULL REFERENCES teams(id),
        actorId TEXT NOT NULL,
        actorRole TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        resourceId TEXT,
        payload TEXT,
        createdAt TEXT NOT NULL
      )
    `);
    try {
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_team ON auditLog(teamId)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_ts ON auditLog(createdAt DESC)`);
    } catch (e) {
      console.warn(`[DB][migrate] audit indexes: ${e.message}`);
    }
  },
};
