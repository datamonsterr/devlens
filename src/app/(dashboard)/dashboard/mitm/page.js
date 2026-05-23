import MitmPageClient from "./MitmPageClient";
import RoleGuard from "@/shared/components/RoleGuard";

export default function MitmPage() {
  return (
    <RoleGuard allowed={["manager"]}>
      <MitmPageClient />
    </RoleGuard>
  );
}
