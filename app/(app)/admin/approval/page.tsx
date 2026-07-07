import { redirect } from "next/navigation";
import { ApprovalList } from "@/components/ApprovalList";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFindings } from "@/lib/queries";

export default async function AdminApprovalPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role !== "admin") redirect("/form");

  const findings = await getFindings(supabase);
  return <ApprovalList findings={findings} />;
}
