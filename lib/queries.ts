import type { SupabaseClient } from "@supabase/supabase-js";

const PHOTO_BUCKET = "finding-photos";
const REPORT_BUCKET = "monthly-reports";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

export type FindingPhoto = {
  id: string;
  stage: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
};

export type Finding = {
  id: string;
  code: string;
  foundAt: string;
  foundDatetime: string | null;
  areaId: string | null;
  areaName: string;
  categoryId: string | null;
  categoryName: string;
  photoDescription: string;
  companyName: string;
  status: string;
  resolvedDatetime: string | null;
  createdBy: string;
  createdAt: string;
  photos: FindingPhoto[];
};

function normalizeFinding(row: Record<string, unknown>): Omit<Finding, "photos"> {
  const areas = row.areas as { name?: string } | null;
  const categories = row.categories as { name?: string } | null;
  return {
    id: row.id as string,
    code: row.code as string,
    foundAt: row.found_at as string,
    foundDatetime: (row.found_datetime as string) || null,
    areaId: row.area_id as string | null,
    areaName: areas?.name || "-",
    categoryId: row.category_id as string | null,
    categoryName: categories?.name || "-",
    photoDescription: (row.photo_description as string) || (row.description as string) || "",
    companyName: (row.company_name as string) || (row.department as string) || "-",
    status: row.status as string,
    resolvedDatetime: (row.resolved_datetime as string) || null,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

async function getFindingPhotos(client: SupabaseClient, findingId: string) {
  const { data, error } = await client
    .from("finding_photos")
    .select("id, stage, storage_path, created_at")
    .eq("finding_id", findingId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((photo) => ({
    id: photo.id,
    stage: photo.stage,
    storagePath: photo.storage_path,
    publicUrl: client.storage.from(PHOTO_BUCKET).getPublicUrl(photo.storage_path).data.publicUrl,
    createdAt: photo.created_at,
  }));
}

export async function getCurrentProfile(client: SupabaseClient): Promise<Profile> {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("Anda harus login terlebih dahulu.");

  const { data, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  return data || {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email || "User",
    role: "field_staff",
  };
}

export async function getAreas(client: SupabaseClient) {
  const { data, error } = await client.from("areas").select("id, name").order("name");
  if (error) throw error;
  return data || [];
}

export async function getCategories(client: SupabaseClient) {
  const { data, error } = await client.from("categories").select("id, name").order("name");
  if (error) throw error;
  return data || [];
}

export async function getFindings(client: SupabaseClient): Promise<Finding[]> {
  const { data, error } = await client
    .from("findings")
    .select("*, areas(name), categories(name)")
    .order("found_datetime", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return Promise.all(
    (data || []).map(async (row) => ({
      ...normalizeFinding(row),
      photos: await getFindingPhotos(client, row.id),
    }))
  );
}

export async function createFinding(
  client: SupabaseClient,
  payload: {
    foundDatetime: string;
    areaId: string;
    categoryId: string;
    photoDescription: string;
  }
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Anda harus login terlebih dahulu.");
  const profile = await getCurrentProfile(client);

  const { data, error } = await client
    .from("findings")
    .insert({
      found_at: payload.foundDatetime.slice(0, 10),
      found_datetime: payload.foundDatetime,
      area_id: payload.areaId,
      category_id: payload.categoryId,
      description: payload.photoDescription,
      photo_description: payload.photoDescription,
      company_name: profile.full_name,
      department: profile.full_name,
      status: "open",
      created_by: user.id,
    })
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: data.id,
    actor_id: user.id,
    action: "created",
    detail: `Temuan ${data.code} dibuat`,
  });
  return data;
}

export async function submitProgressUpdate(
  client: SupabaseClient,
  findingId: string,
  resolvedDatetime: string
) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Anda harus login terlebih dahulu.");

  const { data, error } = await client
    .from("findings")
    .update({ status: "progress", resolved_datetime: resolvedDatetime })
    .eq("id", findingId)
    .eq("created_by", user.id)
    .eq("status", "open")
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: findingId,
    actor_id: user.id,
    action: "status_changed",
    detail: "Status diubah menjadi progress (menunggu approval admin)",
  });
  return data;
}

export async function approveFinding(client: SupabaseClient, findingId: string) {
  const profile = await getCurrentProfile(client);
  if (profile.role !== "admin") throw new Error("Hanya admin yang dapat menyetujui temuan.");

  const { data, error } = await client
    .from("findings")
    .update({ status: "closed" })
    .eq("id", findingId)
    .eq("status", "progress")
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: findingId,
    actor_id: profile.id,
    action: "status_changed",
    detail: "Disetujui admin — status closed",
  });
  return data;
}

export async function uploadFindingPhoto(
  client: SupabaseClient,
  findingId: string,
  blob: Blob,
  stage: "before" | "after"
) {
  const profile = await getCurrentProfile(client);
  const fileName = `${findingId}/${stage}-${Date.now()}.webp`;

  const { error: uploadError } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(fileName, blob, { contentType: "image/webp", upsert: false });
  if (uploadError) throw uploadError;

  const { error } = await client
    .from("finding_photos")
    .insert({
      finding_id: findingId,
      stage,
      storage_path: fileName,
      uploaded_by: profile.id,
    });
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: findingId,
    actor_id: profile.id,
    action: "photo_uploaded",
    detail: `Foto ${stage} diunggah`,
  });
}

export async function uploadMonthlyReport(
  client: SupabaseClient,
  file: File,
  reportMonth: string,
  companyName: string
) {
  const profile = await getCurrentProfile(client);
  const storagePath = `${profile.id}/${reportMonth}-${Date.now()}-${file.name}`;

  const { error: uploadError } = await client.storage
    .from(REPORT_BUCKET)
    .upload(storagePath, file, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("monthly_reports")
    .insert({
      uploaded_by: profile.id,
      company_name: companyName,
      report_month: reportMonth,
      storage_path: storagePath,
      file_name: file.name,
    })
    .select("id, report_month, file_name, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function getMonthlyReports(client: SupabaseClient) {
  const { data, error } = await client
    .from("monthly_reports")
    .select("id, company_name, report_month, file_name, created_at")
    .order("report_month", { ascending: false });
  if (error) throw error;
  return data || [];
}
