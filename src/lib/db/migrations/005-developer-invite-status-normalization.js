export default {
  version: 5,
  name: "developer-invite-status-normalization",
  async up(db) {
    await db.exec(`UPDATE users SET inviteStatus = 'pending' WHERE role = 'developer' AND inviteStatus = 'invited'`);
    await db.exec(`UPDATE users SET inviteStatus = 'onboarded' WHERE role = 'developer' AND inviteStatus = 'accepted'`);
    await db.exec(`UPDATE users SET inviteStatus = 'pending' WHERE role = 'developer' AND inviteStatus IS NULL AND clerkUserId LIKE 'invite:%'`);
  },
};
