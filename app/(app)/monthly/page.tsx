import { redirect } from "next/navigation";
import { MonthlyReportForm } from "@/components/MonthlyReportForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getMonthlyReports } from "@/lib/queries";

export default async function MonthlyPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role === "admin") redirect("/admin/dashboard");

  const reports = await getMonthlyReports(supabase);
  return (
    <MonthlyReportForm
      companyName={profile.full_name || ""}
      reports={reports}
    />
  );
}
