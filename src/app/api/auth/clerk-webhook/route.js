import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { headers } from "next/headers";

function verifyClerkWebhook(body, svixId, svixTimestamp, svixSignature) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return false;
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const expected = crypto.createHmac("sha256", secret.split("_").pop()).update(signedContent).digest("base64");
  const parts = svixSignature.split(",");
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "v1" && v === expected) return true;
  }
  return false;
}

async function createTeam(adapter, org) {
  const teamId = uuidv4();
  const now = new Date().toISOString();
  await adapter.run(
    `INSERT INTO teams(id, name, clerkOrgId, rtkPool, createdAt, updatedAt) VALUES(?, ?, ?, 0, ?, ?)`,
    [teamId, org.name || "My Team", org.id, now, now]
  );
  return teamId;
}

async function ensureUser(adapter, clerkUserId, teamId, role) {
  const now = new Date().toISOString();
  const existing = await adapter.get(`SELECT id FROM users WHERE clerkUserId = ?`, [clerkUserId]);
  if (existing) {
    await adapter.run(`UPDATE users SET teamId = ?, role = ?, updatedAt = ? WHERE clerkUserId = ?`, [teamId, role, now, clerkUserId]);
    return existing.id;
  }
  const userId = uuidv4();
  await adapter.run(
    `INSERT INTO users(id, clerkUserId, teamId, role, isActive, createdAt, updatedAt) VALUES(?, ?, ?, ?, 1, ?, ?)`,
    [userId, clerkUserId, teamId, role, now, now]
  );
  return userId;
}

export async function POST(req) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  if (!verifyClerkWebhook(body, svixId, svixTimestamp, svixSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;
  const adapter = await getAdapter();

  try {
    await adapter.transaction(async () => {
      switch (type) {
        case "organization.created": {
          await createTeam(adapter, data);
          break;
        }

        case "organizationMembership.created": {
          const orgId = data.organization.id;
          const clerkUserId = data.public_user_data.user_id;

          const team = await adapter.get(`SELECT id FROM teams WHERE clerkOrgId = ?`, [orgId]);
          if (!team) break;

          const role = data.role === "org:admin" ? "manager" : "developer";
          await ensureUser(adapter, clerkUserId, team.id, role);
          break;
        }

        case "user.updated": {
          const role = data.public_metadata?.role;
          if (role) {
            await adapter.run(`UPDATE users SET role = ?, updatedAt = ? WHERE clerkUserId = ?`, [role, new Date().toISOString(), data.id]);
          }
          break;
        }
      }
    });
  } catch (e) {
    console.error(`[ClerkWebhook] Error handling ${type}:`, e.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
