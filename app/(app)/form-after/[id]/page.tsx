import { redirect, notFound } from "next/navigation";
import { FindingAfterForm } from "@/components/FindingAfterForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getFindingById } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export default async function FormAfterPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role === "admin") redirect("/admin/dashboard");

  const finding = await getFindingById(supabase, id);
  if (!finding) notFound();
  if (finding.createdBy !== profile.id) redirect("/dashboard");
  if (finding.status !== "open" && finding.status !== "rejected") redirect("/dashboard");

  return <FindingAfterForm finding={finding} />;
}
