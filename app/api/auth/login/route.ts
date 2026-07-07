import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAIL, getCompanyById } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, companyId, pin } = body as {
    type: "user" | "admin";
    companyId?: string;
    pin?: string;
  };

  const demoPassword = process.env.SIGAP_DEMO_PASSWORD;
  const adminPin = process.env.SIGAP_ADMIN_PIN || "152114";

  if (!demoPassword) {
    return NextResponse.json({ error: "SIGAP_DEMO_PASSWORD belum dikonfigurasi." }, { status: 500 });
  }

  let email: string;

  if (type === "admin") {
    if (pin !== adminPin) {
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
  const { error } = await supabase.auth.signInWithPassword({ email, password: demoPassword });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
