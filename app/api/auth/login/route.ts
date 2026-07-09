import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL, getCompanyById } from "@/lib/constants";
import { getServerSecrets, getSupabaseEnv } from "@/lib/env";
import { toErrorBody } from "@/lib/errors";
import { isValidAdminPin } from "@/lib/pin";

function isUndefinedColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "42703"
  );
}

export async function POST(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json(
      toErrorBody(
        null,
        "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum dikonfigurasi di server.",
        "AUTH"
      ),
      { status: 500 }
    );
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return NextResponse.json(
      toErrorBody(
        null,
        "SIGAP_DEMO_PASSWORD / SIGAP_ADMIN_PIN belum dikonfigurasi di server.",
        "AUTH"
      ),
      { status: 500 }
    );
  }

  const body = await request.json();
  const { type, companyId, pin } = body as {
    type: "user" | "admin";
    companyId?: string;
    pin?: string;
  };

  let email: string;

  if (type === "admin") {
    if (!pin || !isValidAdminPin(pin)) {
      return NextResponse.json(toErrorBody(null, "PIN harus 6-8 digit angka.", "AUTH"), {
        status: 400,
      });
    }
    if (pin !== secrets.adminPin) {
      return NextResponse.json(toErrorBody(null, "PIN salah.", "AUTH"), { status: 401 });
    }
    email = ADMIN_EMAIL;
  } else {
    const company = getCompanyById(companyId || "");
    if (!company) {
      return NextResponse.json(
        toErrorBody(null, "Perusahaan tidak ditemukan.", "AUTH"),
        { status: 400 }
      );
    }
    email = company.email;
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password: secrets.demoPassword,
  });

  if (error) {
    return NextResponse.json(toErrorBody(error, error.message, "AUTH"), { status: 401 });
  }

  if (type !== "admin" && authData.user) {
    let profileQuery = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (isUndefinedColumnError(profileQuery.error)) {
      profileQuery = await supabase
        .from("profiles")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();
    }
    const { data: profile } = profileQuery;
    if (profile && "is_active" in profile && profile.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.json(
        toErrorBody(null, "Akun PIC tidak aktif.", "AUTH"),
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
