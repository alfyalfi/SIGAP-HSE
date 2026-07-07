import { redirect } from "next/navigation";
import { FindingForm } from "@/components/FindingForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";

export default async function FormPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role === "admin") redirect("/admin/dashboard");

  return <FindingForm companyName={profile.full_name || ""} />;
}
