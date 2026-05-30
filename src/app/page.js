import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function InitPage() {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // User is logged in but has no orgId
  if (!orgId) {
    // Check if they have a role defined in metadata
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = user.unsafeMetadata?.role;
    
    // If they have a role but no org, they either need to create an org (manager)
    // or wait for an invite (developer)
    if (role === 'manager') {
      redirect("/onboarding/manager"); // Re-route to actual Clerk Org creation flow
    } else if (role === 'developer') {
      // In a more robust system, we would have a waiting page here. For now, redirect to onboarding 
      // or dashboard depending on how invitations are handled in the app
      redirect("/onboarding"); 
    } else {
      // No role chosen yet
      redirect("/onboarding");
    }
  }

  redirect("/dashboard");
}
