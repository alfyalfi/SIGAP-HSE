import { redirect } from "next/navigation";
import { getSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";

export default async function HomePage() {
  if (!getSupabaseEnv()) {
    redirect("/login?error=config");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase);
  redirect(profile.role === "admin" ? "/admin/dashboard" : "/form");
}
