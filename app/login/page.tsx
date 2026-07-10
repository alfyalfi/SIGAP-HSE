import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { COMPANIES } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/service";
import { getLoginAccounts, type LoginAccount } from "@/lib/queries";

export default async function LoginPage() {
  let accounts: LoginAccount[] = COMPANIES.map((company) => ({
    id: company.email,
    name: company.name,
    email: company.email,
    role: "field_staff",
    is_active: true,
  }));

  try {
    const service = createServiceClient();
    const loginAccounts = await getLoginAccounts(service);
    if (loginAccounts.length) {
      accounts = loginAccounts;
    }
  } catch {
    // Fall back to static companies when service access is unavailable.
  }

  return (
    <Suspense fallback={<div className="auth-screen active"><p className="muted">Memuat...</p></div>}>
      <LoginForm accounts={accounts} />
    </Suspense>
  );
}
