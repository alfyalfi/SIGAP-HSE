import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries";
import { getServerSecrets, getSupabaseEnv } from "@/lib/env";
import { toErrorBody } from "@/lib/errors";
import { isValidAdminPin } from "@/lib/pin";

export async function POST(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json(toErrorBody(null, "Supabase belum dikonfigurasi.", "ADMIN"), {
      status: 500,
    });
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return NextResponse.json(
      toErrorBody(null, "Server secrets belum dikonfigurasi.", "ADMIN"),
      { status: 500 }
    );
  }

  const body = (await request.json()) as { pin?: string };
  if (!body.pin || !isValidAdminPin(body.pin)) {
    return NextResponse.json(
      toErrorBody(null, "PIN harus 6-8 digit angka.", "ADMIN"),
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role !== "admin") {
    return NextResponse.json(toErrorBody(null, "Akses ditolak.", "ADMIN"), { status: 403 });
  }

  if (body.pin !== secrets.adminPin) {
    return NextResponse.json(toErrorBody(null, "PIN salah.", "ADMIN"), { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
