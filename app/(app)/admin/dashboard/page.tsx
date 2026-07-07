import { redirect } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFindings, getMonthlyReports, getProfiles } from "@/lib/queries";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role !== "admin") redirect("/form");

  const [findings, profiles, reports] = await Promise.all([
    getFindings(supabase),
    getProfiles(supabase),
    getMonthlyReports(supabase),
  ]);

  return <AdminWorkspace initialFindings={findings} initialProfiles={profiles} initialReports={reports} />;
}
