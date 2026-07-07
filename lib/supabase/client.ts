import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase belum dikonfigurasi. Isi environment variables.");
  }
  return createBrowserClient(env.url, env.anonKey);
}
