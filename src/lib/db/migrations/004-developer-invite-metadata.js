export default {
  version: 4,
  name: "developer-invite-metadata",
  async up(db) {
    const columns = await db.all(`PRAGMA table_info(users)`);
    const names = new Set(columns.map((column) => column.name));

    if (!names.has("email")) {
      await db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
    }
    if (!names.has("inviteStatus")) {
      await db.exec(`ALTER TABLE users ADD COLUMN inviteStatus TEXT`);
    }
    if (!names.has("inviteId")) {
      await db.exec(`ALTER TABLE users ADD COLUMN inviteId TEXT`);
    }
    if (!names.has("onboardingEmailStatus")) {
      await db.exec(`ALTER TABLE users ADD COLUMN onboardingEmailStatus TEXT`);
    }

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_team_email ON users(teamId, email)`);
  },
};
