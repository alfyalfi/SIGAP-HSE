import type { SupabaseClient } from "@supabase/supabase-js";
import { getCategoryLabel } from "@/lib/constants";

export const PHOTO_BUCKET = "finding-photos";
export const REPORT_BUCKET = "monthly-reports";
export const PROFILE_LOGO_BUCKET = "profile-logos";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  is_active?: boolean;
  logoPath?: string | null;
  logoUrl?: string | null;
};

export type FindingPhoto = {
  id: string;
  stage: string;
  storagePath: string;
  publicUrl: string;
  createdAt: string;
};

export type PhotoCounts = {
  before: number;
  after: number;
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
  photoCounts: PhotoCounts;
  photos: FindingPhoto[];
};

export type MonthlyReport = {
  id: string;
  companyName: string;
  reportMonth: string;
  reportDate: string | null;
  storagePath: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string | null;
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

function resolveLogoUrl(client: SupabaseClient, logoPath?: string | null) {
  if (!logoPath) return null;
  return client.storage.from(PROFILE_LOGO_BUCKET).getPublicUrl(logoPath).data.publicUrl;
}

function normalizeProfile(client: SupabaseClient, row: Record<string, unknown>): Profile {
  const logoPath = (row.logo_path as string | null) || null;
  return {
    id: row.id as string,
    full_name: (row.full_name as string | null) || null,
    role: (row.role as string) || "field_staff",
    is_active: (row.is_active as boolean | undefined) ?? true,
    logoPath,
    logoUrl: resolveLogoUrl(client, logoPath),
  };
}

function isUndefinedColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42703"
  );
}

function normalizeFinding(row: Record<string, unknown>): Omit<Finding, "photos" | "photoCounts"> {
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

function countPhotosByFinding(rows: Array<{ finding_id: string; stage: string }>) {
  const counts = new Map<string, PhotoCounts>();

  rows.forEach((row) => {
    const current = counts.get(row.finding_id) || { before: 0, after: 0 };
    if (row.stage === "before") current.before += 1;
    if (row.stage === "after") current.after += 1;
    counts.set(row.finding_id, current);
  });

  return counts;
}

export async function getCurrentProfile(client: SupabaseClient): Promise<Profile> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("Anda harus login terlebih dahulu.");

  type ProfileRow = {
    id: string;
    full_name: string | null;
    role: string;
    is_active?: boolean;
    logo_path?: string | null;
  };
  type ProfileResponse = {
    data: ProfileRow | null;
    error: unknown;
  };

  const trySelectProfile = async (withLogo: boolean) =>
    ((await client
      .from("profiles")
      .select(withLogo ? "id, full_name, role, is_active, logo_path" : "id, full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle()) as unknown) as ProfileResponse;

  let { data, error: profileError } = await trySelectProfile(true);
  if (isUndefinedColumnError(profileError)) {
    ({ data, error: profileError } = await trySelectProfile(false));
  }
  if (profileError) throw profileError;

  return (
    (data && normalizeProfile(client, data)) || {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email || "User",
      role: "field_staff",
      is_active: true,
      logoPath: null,
      logoUrl: null,
    }
  );
}

export async function getProfiles(client: SupabaseClient): Promise<Profile[]> {
  type ProfileRow = {
    id: string;
    full_name: string | null;
    role: string;
    is_active?: boolean;
    logo_path?: string | null;
  };
  type ProfileResponse = {
    data: ProfileRow[] | null;
    error: unknown;
  };

  const trySelectProfiles = async (withLogo: boolean) =>
    ((await client
      .from("profiles")
      .select(withLogo ? "id, full_name, role, is_active, logo_path" : "id, full_name, role, is_active")
      .order("full_name")) as unknown) as ProfileResponse;

  let { data, error } = await trySelectProfiles(true);
  if (isUndefinedColumnError(error)) {
    ({ data, error } = await trySelectProfiles(false));
  }
  if (error) throw error;
  return (data || []).map((row: ProfileRow) => normalizeProfile(client, row as Record<string, unknown>));
}

export async function updateProfile(
  client: SupabaseClient,
  id: string,
  payload: { full_name?: string; is_active?: boolean; logoPath?: string | null }
) {
  const profile = await getCurrentProfile(client);
  if (profile.role !== "admin") throw new Error("Hanya admin yang dapat mengubah profil.");

  const dbPayload: Record<string, unknown> = {};
  if (typeof payload.full_name === "string") dbPayload.full_name = payload.full_name;
  if (typeof payload.is_active === "boolean") dbPayload.is_active = payload.is_active;
  if (payload.logoPath !== undefined) dbPayload.logo_path = payload.logoPath;

  type ProfileRow = {
    id: string;
    full_name: string | null;
    role: string;
    is_active?: boolean;
    logo_path?: string | null;
  };
  type ProfileResponse = {
    data: ProfileRow | null;
    error: unknown;
  };

  const tryUpdateProfile = async (withLogo: boolean) =>
    ((await client
      .from("profiles")
      .update(
        withLogo
          ? dbPayload
          : (() => {
              const copy = { ...dbPayload };
              delete copy.logo_path;
              return copy;
            })()
      )
      .eq("id", id)
      .select(withLogo ? "id, full_name, role, is_active, logo_path" : "id, full_name, role, is_active")
      .single()) as unknown) as ProfileResponse;

  let { data, error } = await tryUpdateProfile(true);
  if (isUndefinedColumnError(error)) {
    ({ data, error } = await tryUpdateProfile(false));
  }
  if (error) throw error;
  return normalizeProfile(client, data as unknown as Record<string, unknown>);
}

export async function getFindings(client: SupabaseClient): Promise<Finding[]> {
  const { data, error } = await client
    .from("findings")
    .select(
      "id, code, title, description, found_at, found_datetime, area_text, location_detail, category_text, tikor, photo_description, after_description, company_name, department, status, resolved_datetime, created_by, created_at, areas(name), categories(name)"
    )
    .order("found_datetime", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const findingIds = (data || []).map((row) => row.id as string);
  const { data: photoRows, error: photoError } = findingIds.length
    ? await client.from("finding_photos").select("finding_id, stage").in("finding_id", findingIds)
    : { data: [], error: null };
  if (photoError) throw photoError;

  const counts = countPhotosByFinding(
    (photoRows || []) as Array<{ finding_id: string; stage: string }>
  );

  return (data || []).map((row) => {
    const normalized = normalizeFinding(row);
    return {
      ...normalized,
      photoCounts: counts.get(normalized.id) || { before: 0, after: 0 },
      photos: [],
    };
  });
}

export async function getFindingById(
  client: SupabaseClient,
  id: string
): Promise<Finding | null> {
  const { data, error } = await client
    .from("findings")
    .select(
      "id, code, title, description, found_at, found_datetime, area_text, location_detail, category_text, tikor, photo_description, after_description, company_name, department, status, resolved_datetime, created_by, created_at, areas(name), categories(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const photos = await getFindingPhotos(client, data.id);
  return {
    ...normalizeFinding(data),
    photoCounts: {
      before: photos.filter((photo) => photo.stage === "before").length,
      after: photos.filter((photo) => photo.stage === "after").length,
    },
    photos,
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
      created_by: profile.id,
    })
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: data.id,
    actor_id: profile.id,
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
  const profile = await getCurrentProfile(client);

  const { data, error } = await client
    .from("findings")
    .update({
      status: "progress",
      resolved_datetime: payload.resolvedDatetime,
      after_description: payload.afterDescription.trim(),
    })
    .eq("id", findingId)
    .eq("created_by", profile.id)
    .in("status", ["open", "rejected"])
    .select("id, code")
    .single();
  if (error) throw error;

  await client.from("activity_log").insert({
    finding_id: findingId,
    actor_id: profile.id,
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

  const basePayload = {
    uploaded_by: profile.id,
    company_name: companyName,
    report_month: `${reportDate.slice(0, 7)}-01`,
    storage_path: storagePath,
    file_name: file.name,
  };
  const payloadWithDate = { ...basePayload, report_date: reportDate };

  type MonthlyReportRow = {
    id: string;
    company_name: string;
    report_month: string;
    report_date?: string | null;
    storage_path: string;
    file_name: string | null;
    created_at: string;
    uploaded_by: string | null;
  };
  type MonthlyReportResponse = {
    data: MonthlyReportRow | null;
    error: unknown;
  };

  let insertResult = ((await client
    .from("monthly_reports")
    .insert(payloadWithDate)
    .select("id, company_name, report_month, report_date, storage_path, file_name, created_at, uploaded_by")
    .single()) as unknown) as MonthlyReportResponse;

  if (isUndefinedColumnError(insertResult.error)) {
    insertResult = ((await client
      .from("monthly_reports")
      .insert(basePayload)
      .select("id, company_name, report_month, storage_path, file_name, created_at, uploaded_by")
      .single()) as unknown) as MonthlyReportResponse;
  }

  const { data, error } = insertResult;
  if (error) throw error;
  const report = data || {
    id: "",
    company_name: companyName,
    report_month: `${reportDate.slice(0, 7)}-01`,
    report_date: reportDate,
    storage_path: storagePath,
    file_name: file.name,
    created_at: new Date().toISOString(),
    uploaded_by: profile.id,
  };
  return {
    id: report.id as string,
    companyName: report.company_name as string,
    reportMonth: report.report_month as string,
    reportDate: (report.report_date as string | null) || reportDate,
    storagePath: report.storage_path as string,
    fileName: (report.file_name as string) || "",
    createdAt: report.created_at as string,
    uploadedBy: (report.uploaded_by as string | null) || null,
  } satisfies MonthlyReport;
}

export async function getMonthlyReports(client: SupabaseClient) {
  type MonthlyReportRow = {
    id: string;
    company_name: string;
    report_month: string;
    report_date?: string | null;
    storage_path: string;
    file_name: string | null;
    created_at: string;
    uploaded_by: string | null;
  };
  type MonthlyReportsResponse = {
    data: MonthlyReportRow[] | null;
    error: unknown;
  };

  let result = ((await client
    .from("monthly_reports")
    .select("id, company_name, report_month, report_date, storage_path, file_name, created_at, uploaded_by")
    .order("created_at", { ascending: false })) as unknown) as MonthlyReportsResponse;
  if (isUndefinedColumnError(result.error)) {
    result = ((await client
      .from("monthly_reports")
      .select("id, company_name, report_month, storage_path, file_name, created_at, uploaded_by")
      .order("created_at", { ascending: false })) as unknown) as MonthlyReportsResponse;
  }
  const { data, error } = result;
  if (error) throw error;
  const rows = (data || []) as MonthlyReportRow[];
  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    reportMonth: row.report_month,
    reportDate: row.report_date || null,
    storagePath: row.storage_path,
    fileName: row.file_name || "",
    createdAt: row.created_at,
    uploadedBy: row.uploaded_by,
  })) satisfies MonthlyReport[];
}

export async function deleteMonthlyReports(
  client: SupabaseClient,
  reportIds: string[]
) {
  const { data, error } = await client
    .from("monthly_reports")
    .select("id, storage_path, file_name, company_name")
    .in("id", reportIds);
  if (error) throw error;
  return data || [];
}
