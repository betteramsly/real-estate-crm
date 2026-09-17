const FALLBACK = "/dashboard";

export function safeAppRedirect(path?: string | null): string {
  if (!path) return FALLBACK;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return FALLBACK;
  }
  if (path.includes("://") || path.includes("\\")) return FALLBACK;

  const clean = path.split("?")[0]?.split("#")[0] ?? path;
  if (
    clean.startsWith("/.") ||
    clean === "/login" ||
    clean.startsWith("/login/") ||
    clean === "/register" ||
    clean.startsWith("/register/") ||
    clean.startsWith("/auth") ||
    clean.startsWith("/api/")
  ) {
    return FALLBACK;
  }

  return path;
}
