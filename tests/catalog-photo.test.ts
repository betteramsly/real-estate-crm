import { describe, expect, it } from "vitest";
import {
  canOptimizeCatalogPhoto,
  catalogPhotoSrc,
  isAppleSafari,
  photoPreloadConcurrency,
  photoPreloadRadius,
  photoThumbEagerCount,
} from "@/lib/catalog-photo";

describe("safari photo download", () => {
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

  it("sends Safari a direct file download and leaves other browsers alone", () => {
    expect(isAppleSafari(iphone, "Apple Computer, Inc.")).toBe(true);
    expect(isAppleSafari(mac, "Apple Computer, Inc.")).toBe(true);
    expect(
      isAppleSafari(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
        "Google Inc.",
      ),
    ).toBe(false);
    expect(
      isAppleSafari(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
        "Google Inc.",
      ),
    ).toBe(false);
  });
});

describe("catalog photo loading", () => {
  it("optimizes supabase photos and leaves maps as-is", () => {
    const supabase =
      "https://psfqwkwlawvpvgxectxu.supabase.co/storage/v1/object/public/complexes/x.jpg";
    expect(canOptimizeCatalogPhoto(supabase)).toBe(true);
    expect(catalogPhotoSrc(supabase, 256)).toBe(
      `/_next/image?url=${encodeURIComponent(supabase)}&w=256&q=70`,
    );
    expect(catalogPhotoSrc(supabase, 1080)).toBe(
      `/_next/image?url=${encodeURIComponent(supabase)}&w=1080&q=85`,
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
