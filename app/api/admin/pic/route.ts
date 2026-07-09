import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/queries";
import { getServerSecrets, getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";
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

type AddBody = {
  action: "add";
  pin?: string;
  fullName?: string;
  email?: string;
  role?: string;
};

type DeleteBody = {
  action: "delete";
  pin?: string;
  id?: string;
};

async function requireAdmin(pin?: string) {
  if (!getSupabaseEnv()) {
    return { ok: false as const, response: NextResponse.json(toErrorBody(null, "Supabase belum dikonfigurasi.", "ADMIN"), { status: 500 }) };
  }

  const secrets = getServerSecrets();
  if (!secrets) {
    return {
      ok: false as const,
      response: NextResponse.json(
        toErrorBody(null, "Server secrets belum dikonfigurasi.", "ADMIN"),
        { status: 500 }
      ),
    };
  }

  if (!getSupabaseServiceRoleKey()) {
    return {
      ok: false as const,
      response: NextResponse.json(
        toErrorBody(null, "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.", "ADMIN"),
        { status: 500 }
      ),
    };
  }

  if (!pin || !isValidAdminPin(pin)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        toErrorBody(null, "PIN harus 6-8 digit angka.", "ADMIN"),
        { status: 400 }
      ),
    };
  }

  if (pin !== secrets.adminPin) {
    return {
      ok: false as const,
      response: NextResponse.json(toErrorBody(null, "PIN salah.", "ADMIN"), { status: 401 }),
    };
  }

  const sessionClient = await createClient();
  const profile = await getCurrentProfile(sessionClient);
  if (profile.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json(toErrorBody(null, "Akses ditolak.", "ADMIN"), { status: 403 }),
    };
  }

  return { ok: true as const, secrets };
}

export async function POST(request: Request) {
  const body = (await request.json()) as AddBody;
  const gate = await requireAdmin(body.pin);
  if (!gate.ok) return gate.response;

  if (!body.fullName?.trim()) {
    return NextResponse.json(toErrorBody(null, "Nama PIC wajib diisi.", "ADMIN"), {
      status: 400,
    });
  }
  if (!body.email?.trim()) {
    return NextResponse.json(toErrorBody(null, "Email PIC wajib diisi.", "ADMIN"), {
      status: 400,
    });
  }

  const service = createServiceClient();
  const normalizedEmail = body.email.trim().toLowerCase();
  const tempPassword = gate.secrets.demoPassword;

  const { data: createdUser, error: createUserError } = await service.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: body.fullName.trim() },
  });
  if (createUserError || !createdUser.user) {
    return NextResponse.json(
      toErrorBody(createUserError, "Gagal membuat akun PIC.", "ADMIN"),
      { status: 500 }
    );
  }

  const profilePayload = {
    id: createdUser.user.id,
    full_name: body.fullName.trim(),
    role: body.role || "field_staff",
    is_active: true,
  };

  let profileResult = await service
    .from("profiles")
    .insert(profilePayload)
    .select("id, full_name, role, is_active, logo_path")
    .single();

  if (isUndefinedColumnError(profileResult.error)) {
    profileResult = await service
      .from("profiles")
      .insert(profilePayload)
      .select("id, full_name, role, is_active")
      .single();
  }

  const { data: profile, error: profileError } = profileResult;
  if (profileError) {
    await service.auth.admin.deleteUser(createdUser.user.id).catch(() => undefined);
    return NextResponse.json(
      toErrorBody(profileError, "Gagal menyimpan profil PIC.", "ADMIN"),
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id as string,
      full_name: profile.full_name as string | null,
      role: profile.role as string,
      is_active: profile.is_active as boolean,
      logoPath: (profile.logo_path as string | null) || null,
      logoUrl: null,
      email: normalizedEmail,
      tempPassword,
    },
  });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as DeleteBody;
  const gate = await requireAdmin(body.pin);
  if (!gate.ok) return gate.response;

  if (!body.id) {
    return NextResponse.json(toErrorBody(null, "ID PIC wajib diisi.", "ADMIN"), {
      status: 400,
    });
  }

  const service = createServiceClient();
  const { data: profile, error: fetchError } = await service
    .from("profiles")
    .select("id, logo_path")
    .eq("id", body.id)
    .maybeSingle();
  if (fetchError) {
    if (isUndefinedColumnError(fetchError)) {
      const fallback = await service
        .from("profiles")
        .select("id")
        .eq("id", body.id)
        .maybeSingle();
      if (fallback.error) {
        return NextResponse.json(
          toErrorBody(fallback.error, "Gagal memuat profil PIC.", "ADMIN"),
          { status: 500 }
        );
      }
      if (!fallback.data) {
        return NextResponse.json(toErrorBody(null, "PIC tidak ditemukan.", "ADMIN"), {
          status: 404,
        });
      }
      return NextResponse.json({ ok: true, id: body.id });
    }
    return NextResponse.json(
      toErrorBody(fetchError, "Gagal memuat profil PIC.", "ADMIN"),
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(toErrorBody(null, "PIC tidak ditemukan.", "ADMIN"), {
      status: 404,
    });
  }

  const logoPath = (profile.logo_path as string | null) || null;
  if (logoPath) {
    await service.storage.from("profile-logos").remove([logoPath]).catch(() => undefined);
  }

  const { error: updateError } = await service
    .from("profiles")
    .update({ is_active: false, logo_path: null })
    .eq("id", body.id);
  if (updateError) {
    return NextResponse.json(
      toErrorBody(updateError, "Gagal menonaktifkan PIC.", "ADMIN"),
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: body.id });
}
