import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/UserDashboard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFindings } from "@/lib/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role === "admin") redirect("/admin/dashboard");

  const findings = await getFindings(supabase);
  return <UserDashboard findings={findings} />;
}
