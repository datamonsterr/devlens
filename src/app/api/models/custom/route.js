import { NextResponse } from "next/server";
import { requireManagerContext, requireTeamContext } from "@/lib/auth";
import { getCustomModels, addCustomModel, deleteCustomModel } from "@/models";

export const dynamic = "force-dynamic";

// GET /api/models/custom - List all custom models
export async function GET() {
  try {
    const ctx = await requireTeamContext();
    const models = await getCustomModels(ctx.teamId);
    return NextResponse.json({ models });
  } catch (error) {
    if (error instanceof Response) return error;
    console.log("Error fetching custom models:", error);
    return NextResponse.json({ error: "Failed to fetch custom models" }, { status: 500 });
  }
}

// POST /api/models/custom - Add custom model
export async function POST(request) {
  try {
    const ctx = await requireManagerContext();
    const { providerAlias, id, type, name } = await request.json();
    if (!providerAlias || !id) {
      return NextResponse.json({ error: "providerAlias and id required" }, { status: 400 });
    }
    const added = await addCustomModel({ teamId: ctx.teamId, providerAlias, id, type: type || "llm", name });
    return NextResponse.json({ success: true, added });
  } catch (error) {
    if (error instanceof Response) return error;
    console.log("Error adding custom model:", error);
    return NextResponse.json({ error: "Failed to add custom model" }, { status: 500 });
  }
}

// DELETE /api/models/custom?providerAlias=xxx&id=yyy&type=zzz
export async function DELETE(request) {
  try {
    const ctx = await requireManagerContext();
    const { searchParams } = new URL(request.url);
    const providerAlias = searchParams.get("providerAlias");
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "llm";
    if (!providerAlias || !id) {
      return NextResponse.json({ error: "providerAlias and id required" }, { status: 400 });
    }
    await deleteCustomModel({ teamId: ctx.teamId, providerAlias, id, type });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.log("Error deleting custom model:", error);
    return NextResponse.json({ error: "Failed to delete custom model" }, { status: 500 });
  }
}
