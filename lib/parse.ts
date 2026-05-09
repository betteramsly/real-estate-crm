/**
 * Преобразует значение из FormData в число.
 * Понимает формат с пробелами и неразрывными пробелами вида "1 250 000".
 * Возвращает null, если значение пустое или некорректное.
 */
export function parseNumericFormValue(
  value: FormDataEntryValue | null,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized =
    typeof value === "string"
      ? value.replace(/[\s\u00A0]/g, "")
      : String(value);
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isNaN(n) ? null : n;
}

/**
 * Возвращает строку из FormData или null, если строка пустая.
 */
export function parseStringFormValue(
  value: FormDataEntryValue | null,
): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
