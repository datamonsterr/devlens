import { DashboardLayout } from "@/shared/components";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardRootLayout({ children }) {
  const { orgId } = await auth();
  
  if (!orgId) {
    // Force them back to onboarding if they don't have an active org
    redirect("/onboarding");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

