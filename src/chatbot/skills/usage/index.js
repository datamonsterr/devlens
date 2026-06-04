import { getUsageStats, getUsageHistory, getChartData } from '@/lib/db/repos/usageRepo.js';

const tools = [
  {
    name: 'get_team_usage_summary',
    description: 'Get token usage and cost summary for the team for a given period. Returns total prompt tokens, completion tokens, cost, request count, and active developer count.',
    schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', '24h', '7d', '30d', '60d', 'all'],
          description: 'Time period for the summary. Default: "7d".',
        },
      },
      required: [],
    },
    handler: async (args, context) => {
      const period = args.period || '7d';
      const stats = await getUsageStats(period);

      const history = await getUsageHistory({
        teamId: context.teamId,
        startDate: getStartDate(period),
      });

      const activeDevelopers = new Set(history.filter((h) => h.userId).map((h) => h.userId)).size;

      return {
        period,
        totalRequests: stats.totalRequests || 0,
        totalPromptTokens: stats.totalPromptTokens || 0,
        totalCompletionTokens: stats.totalCompletionTokens || 0,
        totalTokens: (stats.totalPromptTokens || 0) + (stats.totalCompletionTokens || 0),
        totalCost: stats.totalCost || 0,
        activeDevelopers,
        byProvider: stats.byProvider || {},
        topModels: Object.entries(stats.byModel || {})
          .sort((a, b) => b[1].cost - a[1].cost)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data })),
      };
    },
  },

  {
    name: 'get_usage_timeseries',
    description: 'Get daily token consumption time-series data for charting. Returns prompt tokens and completion tokens per day.',
    schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['7d', '30d', '60d'],
          description: 'Time period for the chart. Default: "7d".',
        },
      },
      required: [],
    },
    handler: async (args, context) => {
      const period = args.period || '7d';
      const chartData = await getChartData(period);

      const buckets = (chartData?.buckets || chartData || []).map((b) => ({
        date: b.date || b.dateKey || b.label || '',
        promptTokens: b.promptTokens || 0,
        completionTokens: b.completionTokens || 0,
        totalTokens: (b.promptTokens || 0) + (b.completionTokens || 0),
        cost: Number((b.cost || 0).toFixed(4)),
      }));

      const totals = buckets.reduce(
        (acc, b) => ({
          promptTokens: acc.promptTokens + b.promptTokens,
          completionTokens: acc.completionTokens + b.completionTokens,
          totalTokens: acc.totalTokens + b.totalTokens,
          cost: acc.cost + b.cost,
        }),
        { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 }
      );

      return {
        period,
        daysReturned: buckets.length,
        totals,
        buckets,
      };
    },
  },

  {
    name: 'get_usage_by_developer',
    description: 'Get usage breakdown by developer: tokens, cost, and request count per developer.',
    schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['7d', '30d', '60d'],
          description: 'Time period. Default: "7d".',
        },
      },
      required: [],
    },
    handler: async (args, context) => {
      const period = args.period || '7d';
      const history = await getUsageHistory({
        teamId: context.teamId,
        startDate: getStartDate(period),
      });

      const byDeveloper = {};
      for (const entry of history) {
        const uid = entry.userId || 'unknown';
        if (!byDeveloper[uid]) {
          byDeveloper[uid] = { userId: uid, requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };
        }
        const tokens = entry.tokens || {};
        byDeveloper[uid].requests++;
        byDeveloper[uid].promptTokens += tokens.prompt_tokens || tokens.input_tokens || 0;
        byDeveloper[uid].completionTokens += tokens.completion_tokens || tokens.output_tokens || 0;
        byDeveloper[uid].cost += entry.cost || 0;
      }

      const developers = Object.values(byDeveloper)
        .map((d) => ({
          ...d,
          totalTokens: d.promptTokens + d.completionTokens,
          cost: Number(d.cost.toFixed(4)),
        }))
        .sort((a, b) => b.totalTokens - a.totalTokens);

      return {
        period,
        developerCount: developers.length,
        developers,
      };
    },
  },
];

function getStartDate(period) {
  const now = new Date();
  const days = { '7d': 7, '30d': 30, '60d': 60 };
  const d = days[period] || 7;
  now.setDate(now.getDate() - d);
  return now.toISOString();
}

export default {
  name: 'usage',
  description: 'Usage analytics tools — query team token consumption, cost, timeseries, and per-developer breakdowns.',
  tools,
};
