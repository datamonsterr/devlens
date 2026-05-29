export default {
  version: 6,
  name: "add-teamid-userid-to-requestdetails",
  async up(db) {
    await db.exec(`ALTER TABLE requestDetails ADD COLUMN teamId TEXT REFERENCES teams(id)`);
    await db.exec(`ALTER TABLE requestDetails ADD COLUMN userId TEXT REFERENCES users(id)`);
  },
};
