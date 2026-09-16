import { describe, expect, it } from "vitest";
import { fileOrderToken, mergePhotoOrder } from "@/lib/photo-order";

describe("mergePhotoOrder", () => {
  it("keeps old urls first and appends new uploads", () => {
    expect(mergePhotoOrder(["a", "b"], ["c"])).toEqual(["a", "b", "c"]);
  });

  it("places new files among existing urls", () => {
    expect(
      mergePhotoOrder(
        [fileOrderToken(0), "old", fileOrderToken(1)],
        ["new-a", "new-b"],
      ),
    ).toEqual(["new-a", "old", "new-b"]);
  });

  it("drops missing file tokens and empty urls", () => {
    expect(mergePhotoOrder([fileOrderToken(3), "", "kept"], ["only"])).toEqual([
      "kept",
    ]);
  });
});
