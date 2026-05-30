import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { buildAIROIReport, validateReportFilters } from "@/lib/reports/aiRoiReportService";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const ctx = await requireManagerContext();
    const body = await request.json();

    const filters = validateReportFilters(body, ctx.teamId);

    if (filters.teamId !== ctx.teamId) {
      return NextResponse.json(
        { error: "teamId is out of scope for current Manager" },
        { status: 403 }
      );
    }

    if (filters.memberIds.length > 0) {
      const adapter = await getAdapter();
      const placeholders = filters.memberIds.map(() => "?").join(",");
      const rows = await adapter.all(
        `SELECT id FROM users WHERE teamId = ? AND id IN (${placeholders})`,
        [ctx.teamId, ...filters.memberIds]
      );
      const allowed = new Set(rows.map((row) => row.id));
      const invalid = filters.memberIds.filter((id) => !allowed.has(id));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Some memberIds are outside Team scope", memberIds: invalid },
          { status: 400 }
        );
      }
    }

    const result = await buildAIROIReport(filters);

    return NextResponse.json({
      report: result.report,
      source: result.source,
      meta: {
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;

    const message = error?.message || "Failed to generate AI ROI report";
    const status =
      message.includes("YYYY-MM-DD") ||
      message.includes("startDate") ||
      message.includes("teamId")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
