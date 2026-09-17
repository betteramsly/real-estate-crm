export const APP_HOME = "/properties";

export function safeAppRedirect(path?: string | null): string {
  if (!path) return APP_HOME;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return APP_HOME;
  }
  if (path.includes("://") || path.includes("\\")) return APP_HOME;

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
    return APP_HOME;
  }

  return path;
}
