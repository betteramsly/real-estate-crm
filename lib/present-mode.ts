export const PRESENT_COOKIE = "catalog_present";

export function isPresentCookie(value: string | undefined | null): boolean {
  return value === "1";
}
