import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteFinding, getCurrentProfile } from "@/lib/queries";
import { getServerSecrets, getSupabaseEnv } from "@/lib/env";
import { isValidAdminPin } from "@/lib/pin";

export async function POST(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return NextResponse.json({ error: "Server secrets belum dikonfigurasi." }, { status: 500 });
  }

  const body = await request.json();
  const { findingId, pin } = body as { findingId?: string; pin?: string };

  if (!findingId) {
    return NextResponse.json({ error: "ID temuan wajib diisi." }, { status: 400 });
  }

  if (!pin || !isValidAdminPin(pin)) {
    return NextResponse.json({ error: "PIN harus 6–8 digit angka." }, { status: 400 });
  }

  if (pin !== secrets.adminPin) {
    return NextResponse.json({ error: "PIN salah." }, { status: 401 });
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile(supabase);
  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  try {
    const data = await deleteFinding(supabase, findingId);
    return NextResponse.json({ ok: true, code: data.code });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghapus temuan." },
      { status: 500 }
    );
  }
}
