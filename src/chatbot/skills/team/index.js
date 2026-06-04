import { getAdapter } from '@/lib/db/driver.js';
import { getApiKeys } from '@/lib/db/repos/apiKeysRepo.js';

const tools = [
  {
    name: 'list_team_members',
    description: 'List all team members (developers and managers) with roles, API key counts, and activity status.',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args, context) => {
      const db = await getAdapter();
      const rows = await db.all(
        `SELECT id, clerkUserId, role, isActive, inviteStatus, createdAt, updatedAt
         FROM users WHERE teamId = ?`,
        [context.teamId]
      );

      const apiKeys = await getApiKeys();

      const members = rows.map((row) => {
        const userApiKeys = apiKeys.filter((k) => k.userId === row.id);
        return {
          id: row.id,
          role: row.role,
          isActive: row.isActive === 1,
          inviteStatus: row.inviteStatus || 'active',
          apiKeyCount: userApiKeys.length,
          joinedAt: row.createdAt,
        };
      });

      const managers = members.filter((m) => m.role === 'manager');
      const developers = members.filter((m) => m.role === 'developer');

      return {
        totalMembers: members.length,
        managerCount: managers.length,
        developerCount: developers.length,
        activeCount: members.filter((m) => m.isActive).length,
        members,
      };
    },
  },

  {
    name: 'get_rtk_pool_balance',
    description: 'Get the current RTK (Real-Time Token compression) pool balance for the team.',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args, context) => {
      const db = await getAdapter();
      const team = await db.get(
        `SELECT rtkPool FROM teams WHERE id = ?`,
        [context.teamId]
      );

      const history = await db.all(
        `SELECT action, amount, remainingAfter, timestamp
         FROM rtkPoolHistory WHERE teamId = ?
         ORDER BY timestamp DESC LIMIT 20`,
        [context.teamId]
      );

      const recentHistory = history.map((h) => ({
        action: h.action,
        amount: h.amount,
        remainingAfter: h.remainingAfter,
        timestamp: h.timestamp,
      }));

      const totalAllocated = history
        .filter((h) => h.action === 'allocate')
        .reduce((s, h) => s + (h.amount || 0), 0);
      const totalConsumed = history
        .filter((h) => h.action === 'consume')
        .reduce((s, h) => s + (h.amount || 0), 0);

      return {
        currentBalance: team?.rtkPool || 0,
        totalAllocated,
        totalConsumed,
        recentHistory,
      };
    },
  },

  {
    name: 'get_api_key_counts',
    description: 'Get API key counts and limits for the team.',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args, context) => {
      const db = await getAdapter();
      const apiKeys = await getApiKeys();

      const settingsRow = await db.get(
        `SELECT maxKeysPerDeveloper, data FROM teamSettings WHERE teamId = ?`,
        [context.teamId]
      );

      const maxKeysPerDeveloper = settingsRow?.maxKeysPerDeveloper || 5;

      const byDeveloper = {};
      for (const key of apiKeys) {
        const uid = key.userId || 'unknown';
        if (!byDeveloper[uid]) byDeveloper[uid] = { userId: uid, count: 0, keys: [] };
        byDeveloper[uid].count++;
        byDeveloper[uid].keys.push({
          id: key.id,
          name: key.name,
          createdAt: key.createdAt,
        });
      }

      return {
        totalApiKeys: apiKeys.length,
        maxKeysPerDeveloper,
        developerCount: Object.keys(byDeveloper).length,
        byDeveloper: Object.values(byDeveloper),
      };
    },
  },
];

export default {
  name: 'team',
  description: 'Team management tools — list members, check RTK pool balance, and view API key distribution.',
  tools,
};
