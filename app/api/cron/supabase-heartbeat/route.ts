import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";
import { toErrorBody } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json(toErrorBody(null, "Supabase belum dikonfigurasi.", "CRON"), {
      status: 500,
    });
  }

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json(
      toErrorBody(null, "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.", "CRON"),
      { status: 500 }
    );
  }

  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && process.env.NODE_ENV === "production") {
    return NextResponse.json(toErrorBody(null, "Forbidden.", "CRON"), { status: 403 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("areas").select("id").limit(1);

  if (error) {
    return NextResponse.json(toErrorBody(error, error.message, "CRON"), { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Heartbeat berhasil dijalankan.",
  });
}
