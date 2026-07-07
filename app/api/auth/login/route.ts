import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL, getCompanyById } from "@/lib/constants";
import { getServerSecrets, getSupabaseEnv } from "@/lib/env";
import { isValidAdminPin } from "@/lib/pin";

export async function POST(request: Request) {
  if (!getSupabaseEnv()) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum dikonfigurasi di server." },
      { status: 500 }
    );
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return NextResponse.json(
      { error: "SIGAP_DEMO_PASSWORD / SIGAP_ADMIN_PIN belum dikonfigurasi di server." },
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
      return NextResponse.json(
        { error: "PIN harus 6–8 digit angka." },
        { status: 400 }
      );
    }
    if (pin !== secrets.adminPin) {
      return NextResponse.json({ error: "PIN salah." }, { status: 401 });
    }
    email = ADMIN_EMAIL;
  } else {
    const company = getCompanyById(companyId || "");
    if (!company) {
      return NextResponse.json({ error: "Perusahaan tidak ditemukan." }, { status: 400 });
    }
    email = company.email;
  }

  const supabase = await createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password: secrets.demoPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (type !== "admin" && authData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Akun PIC tidak aktif." }, { status: 403 });
    }
  }

  return NextResponse.json({ ok: true });
}
