/**
 * Сравнивает два объекта по списку ключей и возвращает разницу
 * в виде { field: { from, to } }. Если изменений нет — пустой объект.
 *
 * Используется в server actions, чтобы записывать в журнал
 * activities только реально изменённые поля.
 */
export function diffRecords<T extends Record<string, unknown>>(
  before: T | null | undefined,
  after: Partial<T>,
  fields: (keyof T)[],
): Record<string, { from: unknown; to: unknown }> {
  const result: Record<string, { from: unknown; to: unknown }> = {};
  if (!before) return result;
  for (const field of fields) {
    const a = before[field] ?? null;
    const b = (after as Record<string, unknown>)[field as string] ?? null;
    if (a !== b) {
      result[field as string] = { from: a, to: b };
    }
  }
  return result;
}
