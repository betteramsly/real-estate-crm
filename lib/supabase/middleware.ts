import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS, isAuthPrefetch } from "@/lib/supabase/auth-cookies";

const PUBLIC_PATHS = ["/login", "/register", "/auth", "/s", "/api/photo-download"];
const PUBLIC_WITHOUT_SESSION = ["/auth", "/s", "/api/photo-download"];

const PRESENT_BLOCKED = [
  "/dashboard",
  "/clients",
  "/deals",
  "/tasks",
  "/team",
  "/settings",
];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

function isPresentBlocked(path: string) {
  if (path === "/properties/new" || path.startsWith("/properties/new/")) {
    return true;
  }
  return PRESENT_BLOCKED.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  // Public callbacks, shared catalogues and photo downloads never need a
  // session refresh. Avoiding the remote auth lookup keeps them fast and
  // prevents public traffic from consuming Supabase and function resources.
  if (
    PUBLIC_WITHOUT_SESSION.some(
      (publicPath) =>
        path === publicPath || path.startsWith(`${publicPath}/`),
    )
  ) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options: CookieOptions }[],
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const isPublic = isPublicPath(path);
  const prefetch = isAuthPrefetch(request.headers);

  // Prefetch can fire many routes at once after the JWT expires. A real
  // navigation still refreshes via getUser(); prefetch only checks the cookie
  // so parallel refreshes do not kill the session.
  if (prefetch) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", path);
      return NextResponse.redirect(url);
    }
    if (session && (path === "/login" || path === "/register")) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.delete("redirectTo");
      return NextResponse.redirect(url);
    }
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  const presentMode = request.cookies.get("catalog_present")?.value === "1";
  if (user && presentMode && isPresentBlocked(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/properties";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
