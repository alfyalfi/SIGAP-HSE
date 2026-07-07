import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryLabel } from "@/lib/constants";

const PHOTO_BUCKET = "finding-photos";
const REPORT_BUCKET = "monthly-reports";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  is_active?: boolean;
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
  title: string;
  foundAt: string;
  foundDatetime: string | null;
  areaText: string;
  areaName: string;
  categoryText: string;
  categoryName: string;
  tikor: string | null;
  photoDescription: string;
  afterDescription: string;
  companyName: string;
  status: string;
  resolvedDatetime: string | null;
  createdBy: string;
  createdAt: string;
  photos: FindingPhoto[];
};

function resolveAreaName(row: Record<string, unknown>) {
  const areas = row.areas as { name?: string } | null;
  return (
    (row.area_text as string) ||
    areas?.name ||
    (row.location_detail as string) ||
    "-"
  );
}

function resolveCategoryName(row: Record<string, unknown>) {
  const categories = row.categories as { name?: string } | null;
  const raw =
    (row.category_text as string) ||
    categories?.name ||
    "";
  return getCategoryLabel(raw) || raw || "-";
}

function normalizeFinding(row: Record<string, unknown>): Omit<Finding, "photos"> {
  const areaName = resolveAreaName(row);
  const categoryName = resolveCategoryName(row);
  return {
    id: row.id as string,
    code: row.code as string,
    title: (row.title as string) || (row.description as string) || "-",
    foundAt: row.found_at as string,
    foundDatetime: (row.found_datetime as string) || null,
    areaText: areaName,
    areaName,
    categoryText: (row.category_text as string) || "",
    categoryName,
    tikor: (row.tikor as string) || null,
    photoDescription:
      (row.photo_description as string) || (row.description as string) || "",
    afterDescription: (row.after_description as string) || "",
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
    publicUrl: client.storage.from(PHOTO_BUCKET).getPublicUrl(photo.storage_path).data
      .publicUrl,
    createdAt: photo.created_at,
  }));
}

export async function getCurrentProfile(client: SupabaseClient): Promise<Profile> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Anda harus login terlebih dahulu.");

  const { data, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  return (
    data || {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email || "User",
      role: "field_staff",
      is_active: true,
    }
  );
}

export async function getProfiles(client: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, role, is_active")
    .order("full_name");
  if (error) throw error;
  return data || [];
}

export async function updateProfile(
  client: SupabaseClient,
  id: string,
  payload: { full_name?: string; is_active?: boolean }
) {
  const profile = await getCurrentProfile(client);
  if (profile.role !== "admin") throw new Error("Hanya admin yang dapat mengubah profil.");

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, full_name, role, is_active")
    .single();
  if (error) throw error;
  return data;
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

export async function getFindingById(
  client: SupabaseClient,
  id: string
): Promise<Finding | null> {
  const { data, error } = await client
    .from("findings")
    .select("*, areas(name), categories(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...normalizeFinding(data),
    photos: await getFindingPhotos(client, data.id),
  };
}

export async function createFinding(
  client: SupabaseClient,
  payload: {
    foundDatetime: string;
    title: string;
    areaText: string;
    categoryText: string;
    tikor?: string;
    photoDescription: string;
  }
) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Anda harus login terlebih dahulu.");
  const profile = await getCurrentProfile(client);

  const { data, error } = await client
    .from("findings")
    .insert({
      found_at: payload.foundDatetime.slice(0, 10),
      found_datetime: payload.foundDatetime,
      title: payload.title.trim(),
      area_text: payload.areaText.trim(),
      category_text: payload.categoryText,
      tikor: payload.tikor?.trim() || null,
      description: payload.photoDescription.trim(),
      photo_description: payload.photoDescription.trim(),
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
  payload: {
    resolvedDatetime: string;
    afterDescription: string;
  }
) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Anda harus login terlebih dahulu.");

  const { data, error } = await client
    .from("findings")
    .update({
      status: "progress",
      resolved_datetime: payload.resolvedDatetime,
      after_description: payload.afterDescription.trim(),
    })
    .eq("id", findingId)
    .eq("created_by", user.id)
    .in("status", ["open", "rejected"])
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

export async function rejectFinding(client: SupabaseClient, findingId: string) {
  const profile = await getCurrentProfile(client);
  if (profile.role !== "admin") throw new Error("Hanya admin yang dapat menolak temuan.");

  const { data, error } = await client
    .from("findings")
    .update({ status: "rejected" })
    .eq("id", findingId)
    .eq("status", "progress")
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: findingId,
    actor_id: profile.id,
    action: "status_changed",
    detail: "Ditolak admin — status rejected",
  });
  return data;
}

export async function deleteFinding(client: SupabaseClient, findingId: string) {
  const profile = await getCurrentProfile(client);
  if (profile.role !== "admin") throw new Error("Hanya admin yang dapat menghapus temuan.");

  const photos = await getFindingPhotos(client, findingId);
  const paths = photos.map((p) => p.storagePath).filter(Boolean);
  if (paths.length) {
    await client.storage.from(PHOTO_BUCKET).remove(paths);
  }

  const { data, error } = await client
    .from("findings")
    .delete()
    .eq("id", findingId)
    .select("id, code")
    .single();
  if (error) throw error;

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

  const { error } = await client.from("finding_photos").insert({
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
  reportDate: string,
  companyName: string
) {
  const profile = await getCurrentProfile(client);
  const storagePath = `${profile.id}/${reportDate}-${Date.now()}-${file.name}`;

  const { error: uploadError } = await client.storage
    .from(REPORT_BUCKET)
    .upload(storagePath, file, { upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("monthly_reports")
    .insert({
      uploaded_by: profile.id,
      company_name: companyName,
      report_month: `${reportDate.slice(0, 7)}-01`,
      report_date: reportDate,
      storage_path: storagePath,
      file_name: file.name,
    })
    .select("id, report_month, report_date, file_name, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function getMonthlyReports(client: SupabaseClient) {
  const { data, error } = await client
    .from("monthly_reports")
    .select("id, company_name, report_month, report_date, file_name, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
