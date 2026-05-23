import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function InitPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect("/onboarding");
  redirect("/dashboard");
}
