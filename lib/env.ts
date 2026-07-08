import { isValidAdminPin } from "@/lib/pin";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes("xxxxxxxx") || anonKey.includes("your-anon-key")) {
    return null;
  }

  return { url, anonKey };
}

export function getServerSecrets() {
  const demoPassword = process.env.SIGAP_DEMO_PASSWORD;
  const adminPin = process.env.SIGAP_ADMIN_PIN;

  if (!demoPassword || demoPassword.includes("your-")) {
    return null;
  }

  if (!adminPin || adminPin.includes("your-") || !isValidAdminPin(adminPin)) {
    return null;
  }

  return { demoPassword, adminPin };
}

export function getSupabaseServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey.includes("your-service-role-key")) {
    return null;
  }

  return serviceRoleKey;
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/form") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/monthly") ||
    pathname.startsWith("/admin")
  );
}

export function isConfigReady() {
  return Boolean(getSupabaseEnv() && getServerSecrets());
}
