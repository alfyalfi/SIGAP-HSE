import { redirect } from "next/navigation";
import { FindingForm } from "@/components/FindingForm";
import { createClient } from "@/lib/supabase/server";
import { getAreas, getCategories, getCurrentProfile } from "@/lib/queries";

export default async function FormPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role === "admin") redirect("/admin/dashboard");

  const [areas, categories] = await Promise.all([
    getAreas(supabase),
    getCategories(supabase),
  ]);

  return (
    <FindingForm
      companyName={profile.full_name || ""}
      areas={areas}
      categories={categories}
    />
  );
}
