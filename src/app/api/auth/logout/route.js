import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearDashboardAuthCookie } from "@/lib/auth/dashboardSession";

export async function POST() {
  clearDashboardAuthCookie(await cookies());
  return NextResponse.json({ success: true });
}
