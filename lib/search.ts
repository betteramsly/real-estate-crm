/**
 * Keeps PostgREST's `.or()` grammar out of a user-controlled filter string.
 * The remaining characters cover names, phones and email addresses.
 */
export function normalizeSearchTerm(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}@.+\-\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
