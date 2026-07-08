import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });
  }

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." },
      { status: 500 }
    );
  }

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("areas").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Heartbeat berhasil dijalankan.",
  });
}
