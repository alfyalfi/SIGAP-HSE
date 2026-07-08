import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export function createServiceClient() {
  const env = getSupabaseEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!env) {
    throw new Error("Supabase belum dikonfigurasi. Isi environment variables.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }

  return createClient(env.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
