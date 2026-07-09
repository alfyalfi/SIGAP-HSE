import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/queries";
import { getServerSecrets, getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";
import { toErrorBody } from "@/lib/errors";
import { isValidAdminPin } from "@/lib/pin";

export async function POST(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json(toErrorBody(null, "Supabase belum dikonfigurasi.", "REPORT"), {
      status: 500,
    });
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return NextResponse.json(
      toErrorBody(null, "Server secrets belum dikonfigurasi.", "REPORT"),
      { status: 500 }
    );
  }

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json(
      toErrorBody(null, "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.", "REPORT"),
      { status: 500 }
    );
  }

  const body = await request.json();
  const { reportIds, pin } = body as { reportIds?: string[]; pin?: string };

  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return NextResponse.json(toErrorBody(null, "Pilih minimal satu laporan.", "REPORT"), {
      status: 400,
    });
  }

  if (!pin || !isValidAdminPin(pin)) {
    return NextResponse.json(
      toErrorBody(null, "PIN harus 6-8 digit angka.", "REPORT"),
      { status: 400 }
    );
  }

  if (pin !== secrets.adminPin) {
    return NextResponse.json(toErrorBody(null, "PIN salah.", "REPORT"), { status: 401 });
  }

  const sessionClient = await createClient();
  const profile = await getCurrentProfile(sessionClient);
  if (profile.role !== "admin") {
    return NextResponse.json(toErrorBody(null, "Akses ditolak.", "REPORT"), { status: 403 });
  }

  const service = createServiceClient();
  const { data: reports, error: fetchError } = await service
    .from("monthly_reports")
    .select("id, storage_path")
    .in("id", reportIds);
  if (fetchError) {
    return NextResponse.json(toErrorBody(fetchError, "Gagal memuat laporan.", "REPORT"), {
      status: 500,
    });
  }

  const storagePaths = (reports || []).map((report) => report.storage_path).filter(Boolean);
  if (storagePaths.length) {
    const { error: storageError } = await service.storage.from("monthly-reports").remove(storagePaths);
    if (storageError) {
      return NextResponse.json(toErrorBody(storageError, "Gagal menghapus file.", "REPORT"), {
        status: 500,
      });
    }
  }

  const { error: deleteError } = await service
    .from("monthly_reports")
    .delete()
    .in("id", reportIds);
  if (deleteError) {
    return NextResponse.json(toErrorBody(deleteError, "Gagal menghapus data.", "REPORT"), {
      status: 500,
    });
  }

  return NextResponse.json({ ok: true, deleted: reportIds.length });
}
