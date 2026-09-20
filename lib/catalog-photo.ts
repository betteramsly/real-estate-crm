export const CATALOG_PHOTO_WIDTHS = [
  256, 384, 640, 750, 828, 1080, 1200, 1920,
] as const;

export type CatalogPhotoWidth = (typeof CATALOG_PHOTO_WIDTHS)[number];

export type PhotoConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

export function canOptimizeCatalogPhoto(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "supabase.co" || host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function catalogPhotoSrc(url: string, width: CatalogPhotoWidth) {
  if (!url || !canOptimizeCatalogPhoto(url)) return url;
  const params = new URLSearchParams({
    url,
    w: String(width),
    q: "70",
  });
  return `/_next/image?${params.toString()}`;
}

export function photoPreloadConcurrency(connection?: PhotoConnection | null) {
  if (connection?.saveData) return 1;
  const type = connection?.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return 1;
  return 2;
}

export function photoPreloadRadius(connection?: PhotoConnection | null) {
  if (connection?.saveData) return 0;
  const type = connection?.effectiveType;
  if (type === "slow-2g" || type === "2g") return 0;
  return 1;
}

export function photoThumbEagerCount(connection?: PhotoConnection | null) {
  if (connection?.saveData) return 2;
  const type = connection?.effectiveType;
  if (type === "slow-2g" || type === "2g") return 2;
  if (type === "3g") return 3;
  return 4;
}

export function readPhotoConnection(): PhotoConnection | null {
  if (typeof navigator === "undefined") return null;
  const connection = (
    navigator as Navigator & { connection?: PhotoConnection }
  ).connection;
  return connection ?? null;
}
