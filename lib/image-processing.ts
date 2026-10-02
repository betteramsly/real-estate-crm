import sharp from "sharp";

export const WEBP_CONTENT_TYPE = "image/webp";
export const STORAGE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const DEFAULT_MAX_EDGE = 3200;
const INPUT_PIXEL_LIMIT = 80_000_000;

type WebpConversionOptions = {
  maxBytes?: number;
  maxEdge?: number;
  failOn?: "none" | "warning" | "error";
};

export type WebpImage = {
  buffer: Buffer;
  width: number;
  height: number;
  animated: boolean;
};

function conversionAttempts(maxEdge: number) {
  const attempts = [
    { edge: maxEdge, quality: 88 },
    { edge: maxEdge, quality: 84 },
    { edge: Math.min(maxEdge, 2800), quality: 82 },
    { edge: Math.min(maxEdge, 2400), quality: 80 },
    { edge: Math.min(maxEdge, 1920), quality: 78 },
  ];

  return attempts.filter(
    (attempt, index) =>
      index === 0 ||
      attempts[index - 1]?.edge !== attempt.edge ||
      attempts[index - 1]?.quality !== attempt.quality,
  );
}

export async function convertImageToWebp(
  input: Buffer | Uint8Array,
  options: WebpConversionOptions = {},
): Promise<WebpImage> {
  const maxBytes = options.maxBytes ?? STORAGE_IMAGE_MAX_BYTES;
  const maxEdge = options.maxEdge ?? DEFAULT_MAX_EDGE;
  const failOn = options.failOn ?? "warning";
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const metadata = await sharp(source, {
    animated: true,
    failOn,
    limitInputPixels: INPUT_PIXEL_LIMIT,
  }).metadata();
  const animated = (metadata.pages ?? 1) > 1;

  for (const { edge, quality } of conversionAttempts(maxEdge)) {
    const { data, info } = await sharp(source, {
      animated,
      autoOrient: true,
      failOn,
      limitInputPixels: INPUT_PIXEL_LIMIT,
    })
      .resize({
        width: edge,
        height: edge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .webp({
        quality,
        alphaQuality: 92,
        effort: 5,
        preset: "photo",
        smartDeblock: true,
        smartSubsample: true,
        minSize: animated,
        mixed: animated,
      })
      .toBuffer({ resolveWithObject: true });

    if (data.byteLength <= maxBytes) {
      return {
        buffer: data,
        width: info.width,
        height: info.pageHeight ?? info.height,
        animated,
      };
    }
  }

  throw new Error("WEBP_OUTPUT_TOO_LARGE");
}
