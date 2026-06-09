import { getProviderConnections } from '@/lib/db/repos/connectionsRepo.js';
import { getProviderNodes } from '@/lib/db/repos/nodesRepo.js';
import { getCombos } from '@/lib/db/repos/combosRepo.js';

const tools = [
  {
    name: 'list_providers',
    description: 'List all provider connections for the team with status, priority, and model count.',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args, context) => {
      const connections = await getProviderConnections({ teamId: context.teamId });
      const nodes = await getProviderNodes();

      const providers = {};
      for (const conn of connections) {
        const key = conn.provider;
        if (!providers[key]) {
          const node = nodes.find((n) => n.id === key);
          providers[key] = {
            provider: key,
            displayName: node?.name || key,
            connectionCount: 0,
            activeCount: 0,
            connections: [],
          };
        }
        providers[key].connectionCount++;
        if (conn.isActive) providers[key].activeCount++;
        providers[key].connections.push({
          id: conn.id,
          name: conn.name || conn.email || 'Unknown',
          isActive: conn.isActive,
          priority: conn.priority,
          authType: conn.authType,
          lastTested: conn.lastTested || null,
          testStatus: conn.testStatus || 'unknown',
        });
      }

      return {
        totalProviders: Object.keys(providers).length,
        totalConnections: connections.length,
        activeConnections: connections.filter((c) => c.isActive).length,
        providers: Object.values(providers).sort((a, b) => b.connectionCount - a.connectionCount),
      };
    },
  },

  {
    name: 'check_provider_status',
    description: 'Check the health/status of provider connections. Shows which are active, failed, or untested.',
    schema: {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          description: 'Optional: filter to a specific provider type (e.g., "openai", "anthropic").',
        },
      },
      required: [],
    },
    handler: async (args, context) => {
      const filter = { teamId: context.teamId };
      if (args.provider) filter.provider = args.provider;

      const connections = await getProviderConnections(filter);

      const statusCounts = { active: 0, failed: 0, untested: 0, rate_limited: 0 };
      const byProvider = {};

      for (const conn of connections) {
        const status = conn.isActive
          ? conn.testStatus === 'error' || conn.lastError
            ? 'failed'
            : conn.testStatus === 'ok'
            ? 'active'
            : 'untested'
          : 'inactive';

        if (status === 'active') statusCounts.active++;
        else if (status === 'failed') statusCounts.failed++;
        else if (status === 'untested') statusCounts.untested++;

        if (!byProvider[conn.provider]) {
          byProvider[conn.provider] = { active: 0, failed: 0, untested: 0, inactive: 0 };
        }
        if (status === 'active' || status === 'failed' || status === 'untested') {
          byProvider[conn.provider][status]++;
        } else {
          byProvider[conn.provider].inactive++;
        }
      }

      return {
        totalConnections: connections.length,
        statusCounts,
        byProvider,
      };
    },
  },

  {
    name: 'get_provider_models',
    description: 'Get available models across all provider connections, including combo configurations.',
    schema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args, context) => {
      const connections = await getProviderConnections({ teamId: context.teamId, isActive: true });
      const combos = await getCombos(context.teamId);

      const modelsByProvider = {};
      for (const conn of connections) {
        const key = conn.provider;
        if (!modelsByProvider[key]) modelsByProvider[key] = [];
        const models = conn.models || [];
        for (const m of models) {
          modelsByProvider[key].push({
            id: m.id || m,
            name: m.name || m,
            provider: key,
            connectionId: conn.id,
          });
        }
      }

      return {
        providerCount: Object.keys(modelsByProvider).length,
        totalModels: Object.values(modelsByProvider).reduce((s, m) => s + m.length, 0),
        comboCount: combos.length,
        combos: combos.map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
          modelCount: (c.models || []).length,
        })),
        modelsByProvider,
      };
    },
  },
];

export default {
  name: 'providers',
  description: 'Provider connection tools — list, check status, and view available models across connected AI providers.',
  tools,
};
