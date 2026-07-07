import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isProtectedPath } from "@/lib/env";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  baseResponse: NextResponse,
  searchParams?: Record<string, string>
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  const redirect = NextResponse.redirect(url);
  copyCookies(baseResponse, redirect);
  return redirect;
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const env = getSupabaseEnv();

  if (!env) {
    if (isProtectedPath(path)) {
      return NextResponse.redirect(
        new URL("/login?error=config", request.url)
      );
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLogin = path === "/login";

    if (!user && isProtectedPath(path)) {
      return redirectWithCookies(request, "/login", supabaseResponse);
    }

    if (user) {
      let isAdmin = false;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = profile?.role === "admin";
      } catch {
        isAdmin = false;
      }

      if (isLogin) {
        return redirectWithCookies(
          request,
          isAdmin ? "/admin/dashboard" : "/form",
          supabaseResponse
        );
      }

      if (path.startsWith("/admin") && !isAdmin) {
        return redirectWithCookies(request, "/form", supabaseResponse);
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("[middleware] updateSession failed:", error);

    if (isProtectedPath(path)) {
      return NextResponse.redirect(new URL("/login?error=session", request.url));
    }

    return NextResponse.next({ request });
  }
}
