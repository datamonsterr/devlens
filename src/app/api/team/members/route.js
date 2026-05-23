import { NextResponse } from "next/server";
import { requireTeamContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const adapter = await getAdapter();
    const members = adapter.all(
      `SELECT id, clerkUserId, role, isActive, createdAt, updatedAt FROM users WHERE teamId = ?`,
      [ctx.teamId]
    );

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Delegate to Clerk for org invitation
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      return NextResponse.json({ error: "Clerk not configured" }, { status: 500 });
    }

    const res = await fetch(
      `https://api.clerk.com/v1/organizations/${ctx.clerkOrgId}/invitations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: email,
          role: "org:member",
          public_metadata: { role: "developer" },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.errors?.[0]?.message || "Invitation failed" }, { status: res.status });
    }

    return NextResponse.json({ success: true, invited: email }, { status: 202 });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const ctx = await requireTeamContext();
    if (ctx.role !== "manager") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const adapter = await getAdapter();
    const now = new Date().toISOString();

    // Mark user inactive
    adapter.run(`UPDATE users SET isActive = 0, updatedAt = ? WHERE id = ? AND teamId = ?`, [now, userId, ctx.teamId]);

    // Revoke all API keys
    adapter.run(`UPDATE apiKeys SET isActive = 0 WHERE userId = ?`, [userId]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
