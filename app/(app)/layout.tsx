import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile(supabase);

  return (
    <div>
      <AppHeader profile={profile} />
      <main className="app-main">{children}</main>
    </div>
  );
}
