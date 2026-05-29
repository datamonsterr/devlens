export default {
  version: 8,
  name: "team-scoped-usage-daily",
  async up(db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS usageDaily_v2 (
        teamId TEXT REFERENCES teams(id),
        dateKey TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (teamId, dateKey)
      )
    `);

    const row = await db.get(`SELECT COUNT(*) as c FROM usageDaily`);
    if (row && row.c > 0) {
      await db.exec(`
        INSERT INTO usageDaily_v2(teamId, dateKey, data)
        SELECT NULL, dateKey, data FROM usageDaily
      `);
    }

    await db.exec(`DROP TABLE IF EXISTS usageDaily`);
    await db.exec(`ALTER TABLE usageDaily_v2 RENAME TO usageDaily`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ud_team ON usageDaily(teamId)`);
  },
};
