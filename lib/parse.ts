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
  return Number.isFinite(n) ? n : null;
}

/**
 * Возвращает строку из FormData или null, если строка пустая.
 */
export function parseStringFormValue(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Converts a datetime-local value to ISO without throwing on forged input.
 * An invalid non-empty value is kept so that the validation schema can reject it.
 */
export function parseDateTimeFormValue(
  value: FormDataEntryValue | null,
  timezoneOffsetMinutes = 0,
): string | null {
  const raw = parseStringFormValue(value);
  if (!raw) return null;
  const local = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (local) {
    const parts = local.slice(1).map((part) => Number(part ?? 0));
    const [year, month, day, hours, minutes, seconds] = parts;
    const wallClock = new Date(
      Date.UTC(year, month - 1, day, hours, minutes, seconds),
    );
    if (
      wallClock.getUTCFullYear() !== year ||
      wallClock.getUTCMonth() !== month - 1 ||
      wallClock.getUTCDate() !== day ||
      wallClock.getUTCHours() !== hours ||
      wallClock.getUTCMinutes() !== minutes ||
      wallClock.getUTCSeconds() !== seconds
    ) {
      return raw;
    }
    return new Date(
      wallClock.getTime() + timezoneOffsetMinutes * 60_000,
    ).toISOString();
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
}
