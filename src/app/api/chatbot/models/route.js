import { NextResponse } from 'next/server';
import { getCombos } from '@/lib/db/repos/combosRepo.js';
import { getProviderNodes } from '@/lib/db/repos/nodesRepo.js';
import { requireManagerContext } from '@/lib/auth/teamContext.js';

export const dynamic = 'force-dynamic';

const TOOL_CAPABLE_PROVIDERS = new Set([
  'openai', 'anthropic', 'google', 'gemini', 'groq',
  'deepseek', 'mistral', 'xai', 'openrouter',
]);

export async function GET() {
  try {
    const ctx = await requireManagerContext();
    const combos = await getCombos(ctx.teamId);
    const nodes = await getProviderNodes();

    const options = [];

    if (combos.length > 0) {
      for (const combo of combos) {
        const models = combo.models || [];
        const toolCapable = models.some((m) =>
          TOOL_CAPABLE_PROVIDERS.has((m.provider || '').toLowerCase())
        );
        options.push({
          value: combo.name,
          label: `${combo.name} (${models.length} models)`,
          type: 'combo',
          toolCapable,
          modelCount: models.length,
        });
      }
    }

    if (options.length === 0) {
      for (const node of nodes) {
        const provider = (node.id || node.type || '').toLowerCase();
        options.push({
          value: node.id || node.type,
          label: node.name || node.type,
          type: 'provider',
          toolCapable: TOOL_CAPABLE_PROVIDERS.has(provider),
        });
      }
    }

    return NextResponse.json({
      options,
      toolCapableCount: options.filter((o) => o.toolCapable).length,
      totalCount: options.length,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
