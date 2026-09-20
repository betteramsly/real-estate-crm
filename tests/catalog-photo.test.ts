import { describe, expect, it } from "vitest";
import {
  canOptimizeCatalogPhoto,
  catalogPhotoSrc,
  photoPreloadConcurrency,
  photoPreloadRadius,
  photoThumbEagerCount,
} from "@/lib/catalog-photo";

describe("catalog photo loading", () => {
  it("optimizes supabase photos and leaves maps as-is", () => {
    const supabase =
      "https://psfqwkwlawvpvgxectxu.supabase.co/storage/v1/object/public/complexes/x.jpg";
    expect(canOptimizeCatalogPhoto(supabase)).toBe(true);
    expect(catalogPhotoSrc(supabase, 256)).toBe(
      `/_next/image?url=${encodeURIComponent(supabase)}&w=256&q=70`,
    );
    expect(
      canOptimizeCatalogPhoto("https://share.api.2gis.ru/getimage?city=grozny"),
    ).toBe(false);
    expect(
      catalogPhotoSrc("https://share.api.2gis.ru/getimage?city=grozny", 1080),
    ).toBe("https://share.api.2gis.ru/getimage?city=grozny");
  });

  it("slows preload on a weak connection", () => {
    expect(photoPreloadConcurrency({ effectiveType: "4g" })).toBe(2);
    expect(photoPreloadConcurrency({ effectiveType: "3g" })).toBe(1);
    expect(photoPreloadConcurrency({ saveData: true })).toBe(1);
    expect(photoPreloadRadius({ effectiveType: "4g" })).toBe(1);
    expect(photoPreloadRadius({ effectiveType: "2g" })).toBe(0);
    expect(photoThumbEagerCount({ effectiveType: "4g" })).toBe(4);
    expect(photoThumbEagerCount({ effectiveType: "3g" })).toBe(3);
    expect(photoThumbEagerCount({ saveData: true })).toBe(2);
  });
});
