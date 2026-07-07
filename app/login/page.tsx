import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="auth-screen active"><p className="muted">Memuat...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
