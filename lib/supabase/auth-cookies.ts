import type { CookieOptions } from "@supabase/ssr";

/** Chrome caps persistent cookies at ~400 days. */
export const AUTH_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  path: "/",
  sameSite: "lax",
  maxAge: AUTH_COOKIE_MAX_AGE,
};

export const LOGIN_EMAIL_KEY = "login_email";

export function readSavedLoginEmail() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LOGIN_EMAIL_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeSavedLoginEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    const value = email.trim();
    if (value) window.localStorage.setItem(LOGIN_EMAIL_KEY, value);
    else window.localStorage.removeItem(LOGIN_EMAIL_KEY);
  } catch {
    // private mode
  }
}

export function isAuthPrefetch(headers: Headers) {
  return (
    headers.get("Next-Router-Prefetch") === "1" ||
    headers.get("Purpose") === "prefetch" ||
    headers.get("Sec-Purpose") === "prefetch"
  );
}
