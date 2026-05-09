import { describe, expect, it } from "vitest";
import { diffRecords } from "@/lib/diff";

describe("diffRecords", () => {
  it("возвращает пустой объект, если before отсутствует", () => {
    expect(diffRecords(null, { a: 1 }, ["a"])).toEqual({});
    expect(diffRecords(undefined, { a: 1 }, ["a"])).toEqual({});
  });

  it("находит изменённые поля", () => {
    const before = { name: "old", price: 100, stage: "new" };
    const after = { name: "new", price: 100, stage: "viewing" };

    expect(diffRecords(before, after, ["name", "price", "stage"])).toEqual({
      name: { from: "old", to: "new" },
      stage: { from: "new", to: "viewing" },
    });
  });

  it("игнорирует неуказанные поля", () => {
    const before = { a: 1, b: 2 };
    const after = { a: 99, b: 99 };

    expect(diffRecords(before, after, ["a"])).toEqual({
      a: { from: 1, to: 99 },
    });
  });

  it("трактует undefined и null как равные", () => {
    const before = { x: null };
    const after = { x: undefined };

    expect(diffRecords(before, after, ["x"])).toEqual({});
  });
});
