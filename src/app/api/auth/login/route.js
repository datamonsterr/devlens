import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings } from "@/lib/localDb";
import { setDashboardAuthCookie } from "@/lib/auth/dashboardSession";
import { checkLock, getClientIp, recordFail, recordSuccess } from "@/lib/auth/loginLimiter";

export async function POST(request) {
  const ip = getClientIp(request);
  const lock = checkLock(ip);
  if (lock.locked) {
    return NextResponse.json({ error: "Too many attempts", retryAfter: lock.retryAfter }, { status: 429 });
  }

  const { password } = await request.json().catch(() => ({}));
  const settings = await getSettings();
  const expected = settings.password || "123456";

  if (password !== expected) {
    const result = recordFail(ip);
    return NextResponse.json(
      { error: "Invalid password", remainingBeforeLock: result.remainingBeforeLock },
      { status: 401 }
    );
  }

  recordSuccess(ip);
  await setDashboardAuthCookie(await cookies(), request, { authMethod: "password" });
  return NextResponse.json({ success: true });
}
