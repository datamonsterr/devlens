import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { getProviderConnections, getCombos, getModelAliases } from "@/lib/localDb";
import { getPricing } from "@/lib/localDb";
import { getDisabledModels } from "@/lib/db";
import { AI_PROVIDERS, getProviderAlias } from "@/shared/constants/providers";
import { AI_MODELS } from "@/shared/constants/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();

    const [connections, combos, aliases, pricing, disabled] = await Promise.all([
      getProviderConnections(),
      getCombos(),
      getModelAliases(),
      getPricing(),
      getDisabledModels(),
    ]);

    const rtkPool = ctx.rtkPool;

    const providers = AI_MODELS.reduce((acc, m) => {
      const alias = getProviderAlias(m.provider) || m.provider;
      if (!acc[alias]) acc[alias] = { id: alias, name: alias, models: [] };
      acc[alias].models.push({
        id: `${alias}/${m.model}`,
        name: m.model,
        provider: alias,
        capabilities: [],
      });
      return acc;
    }, {});

    for (const conn of connections) {
      const alias = conn.providerSpecificData?.prefix || conn.provider;
      if (!providers[alias] && conn.provider !== alias) {
        providers[alias] = { id: alias, name: conn.name || alias, models: [], isCompatible: true };
      }
      if (providers[alias]) {
        providers[alias].status = conn.isActive ? "online" : "offline";
        providers[alias].testStatus = conn.testStatus;
        providers[alias].connectionId = conn.id;
      }
    }

    const modelPricing = {};
    for (const [provider, models] of Object.entries(pricing)) {
      for (const [model, price] of Object.entries(models)) {
        modelPricing[`${provider}/${model}`] = price;
      }
    }

    const providerList = Object.values(providers);

    const comboList = combos.map((c) => ({
      id: c.id,
      name: c.name,
      models: c.models || [],
      kind: c.kind,
      fallbackOrder: c.models,
    }));

    return NextResponse.json({
      providers: providerList,
      combos: comboList,
      pricing: modelPricing,
      rtkActive: rtkPool > 0,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
