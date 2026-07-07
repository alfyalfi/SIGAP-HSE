import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFindings } from "@/lib/queries";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role !== "admin") redirect("/form");

  const findings = await getFindings(supabase);
  return <AdminDashboard findings={findings} />;
}
