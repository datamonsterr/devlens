export default {
  version: 7,
  name: "backfill-requestdetails-teamid-userid",
  async up(db) {
    await db.exec(`
      UPDATE requestDetails
      SET teamId = (
        SELECT u.teamId FROM usageHistory uh
        LEFT JOIN users u ON uh.userId = u.id
        WHERE uh.timestamp = requestDetails.timestamp
          AND uh.provider = requestDetails.provider
          AND uh.model = requestDetails.model
        LIMIT 1
      )
      WHERE teamId IS NULL
    `);

    await db.exec(`
      UPDATE requestDetails
      SET userId = (
        SELECT uh.userId FROM usageHistory uh
        WHERE uh.timestamp = requestDetails.timestamp
          AND uh.provider = requestDetails.provider
          AND uh.model = requestDetails.model
        LIMIT 1
      )
      WHERE userId IS NULL
    `);
  },
};
