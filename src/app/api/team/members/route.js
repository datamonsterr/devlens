import { NextResponse } from "next/server";
import { requireManagerContext } from "@/lib/auth";
import { getAdapter } from "@/lib/db/driver";
import { generateApiKey, hashApiKey } from "@/lib/apiKeyUtils";
import { sendDeveloperOnboardingEmail } from "@/lib/onboardingEmail";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await requireManagerContext();

    const adapter = await getAdapter();
    const members = await adapter.all(
      `SELECT u.id, u.clerkUserId, u.email, u.role, u.inviteStatus, u.onboardingEmailStatus, u.isActive, u.createdAt, u.updatedAt,
        COUNT(ak.id) as apiKeyCount,
        SUM(CASE WHEN ak.isActive = 1 THEN 1 ELSE 0 END) as activeApiKeyCount,
        MAX(ak.lastUsedAt) as lastKeyUsedAt,
        MAX(CASE WHEN ak.name = 'Initial Developer Key' THEN ak.id ELSE NULL END) as assignedApiKeyId,
        MAX(CASE WHEN ak.name = 'Initial Developer Key' THEN ak.createdAt ELSE NULL END) as assignedApiKeyCreatedAt
       FROM users u
       LEFT JOIN apiKeys ak ON ak.userId = u.id
       WHERE u.teamId = ?
       GROUP BY u.id
       ORDER BY u.createdAt ASC`,
      [ctx.teamId]
    );

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const ctx = await requireManagerContext();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      return NextResponse.json({ error: "Clerk not configured" }, { status: 500 });
    }

    const adapter = await getAdapter();
    const team = await adapter.get(`SELECT name FROM teams WHERE id = ?`, [ctx.teamId]);
    const now = new Date().toISOString();
    const existing = await adapter.get(
      `SELECT id FROM users WHERE teamId = ? AND email = ? AND role = 'developer'`,
      [ctx.teamId, normalizedEmail]
    );
    const userId = existing?.id || uuidv4();
    const clerkUserId = existing ? null : `invite:${ctx.teamId}:${normalizedEmail}`;

    const res = await fetch(
      `https://api.clerk.com/v1/organizations/${ctx.clerkOrgId}/invitations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: normalizedEmail,
          role: "org:member",
          public_metadata: { role: "developer" },
        }),
      }
    );

    const invite = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: invite.errors?.[0]?.message || "Invitation failed" }, { status: res.status });
    }

    if (existing) {
      await adapter.run(
        `UPDATE users SET inviteStatus = ?, inviteId = ?, isActive = 1, updatedAt = ? WHERE id = ? AND teamId = ?`,
        ["invited", invite.id || null, now, userId, ctx.teamId]
      );
    } else {
      await adapter.run(
        `INSERT INTO users(id, clerkUserId, email, teamId, role, inviteStatus, inviteId, onboardingEmailStatus, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 'developer', 'invited', ?, 'pending', 1, ?, ?)`,
        [userId, clerkUserId, normalizedEmail, ctx.teamId, invite.id || null, now, now]
      );
    }

    let keyValue = null;
    let keyId = null;
    const initialKey = await adapter.get(
      `SELECT id FROM apiKeys WHERE teamId = ? AND userId = ? AND name = 'Initial Developer Key'`,
      [ctx.teamId, userId]
    );

    if (initialKey) {
      keyId = initialKey.id;
    } else {
      keyValue = generateApiKey();
      keyId = uuidv4();
      await adapter.run(
        `INSERT INTO apiKeys(id, keyHash, name, teamId, userId, isActive, createdAt) VALUES(?, ?, 'Initial Developer Key', ?, ?, 1, ?)`,
        [keyId, hashApiKey(keyValue), ctx.teamId, userId, now]
      );
    }

    let onboardingEmailStatus = "skipped";
    try {
      const emailResult = await sendDeveloperOnboardingEmail({
        email: normalizedEmail,
        teamName: team?.name || "your Team",
        inviteUrl: invite.url || invite.invitation_url || null,
      });
      onboardingEmailStatus = emailResult.status;
    } catch (emailError) {
      onboardingEmailStatus = "failed";
      await adapter.run(`UPDATE users SET onboardingEmailStatus = ?, updatedAt = ? WHERE id = ?`, [onboardingEmailStatus, now, userId]);
      return NextResponse.json({ error: emailError.message }, { status: 502 });
    }

    await adapter.run(`UPDATE users SET onboardingEmailStatus = ?, updatedAt = ? WHERE id = ?`, [onboardingEmailStatus, now, userId]);

    const apiKey = { id: keyId, name: "Initial Developer Key" };
    if (keyValue) apiKey.key = keyValue;

    return NextResponse.json({ success: true, invited: normalizedEmail, userId, apiKey, onboardingEmailStatus }, { status: 202 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const ctx = await requireManagerContext();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const adapter = await getAdapter();
    const now = new Date().toISOString();

    await adapter.run(`UPDATE users SET isActive = 0, updatedAt = ? WHERE id = ? AND teamId = ?`, [now, userId, ctx.teamId]);

    await adapter.run(`UPDATE apiKeys SET isActive = 0 WHERE userId = ? AND teamId = ?`, [userId, ctx.teamId]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
