import { type NextRequest, NextResponse } from "next/server";
import { isProtectedPath } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("[middleware] unhandled error:", error);
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login?error=session", request.url));
    }
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
