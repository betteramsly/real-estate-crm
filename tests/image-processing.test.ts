import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { convertImageToWebp } from "@/lib/image-processing";

describe("image processing", () => {
  it("converts to WebP and keeps the full aspect ratio", async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 4000,
        channels: 3,
        background: "#9a6d4e",
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    const converted = await convertImageToWebp(source, { maxEdge: 1000 });
    const metadata = await sharp(converted.buffer).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(600);
    expect(metadata.height).toBe(1000);
    expect(converted.width).toBe(600);
    expect(converted.height).toBe(1000);
  });

  it("keeps transparency when converting PNG", async () => {
    const source = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 4,
        background: { r: 10, g: 20, b: 30, alpha: 0.35 },
      },
    })
      .png()
      .toBuffer();

    const converted = await convertImageToWebp(source);
    const metadata = await sharp(converted.buffer).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.hasAlpha).toBe(true);
    expect(converted.buffer.byteLength).toBeLessThan(source.byteLength);
  });

  it("keeps animated GIF frames in animated WebP", async () => {
    const source = Buffer.from(
      "R0lGODlhAgACAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAAgACAAAIBgABCAQQEAAh+QQBDAABACwAAAAAAgACAIEAAP8AAAAAAAAAAAAIBgABCAQQEAA7",
      "base64",
    );

    const converted = await convertImageToWebp(source);
    const metadata = await sharp(converted.buffer, { animated: true }).metadata();

    expect(converted.animated).toBe(true);
    expect(metadata.format).toBe("webp");
    expect(metadata.pages).toBe(2);
  });

  it("rejects invalid image data", async () => {
    await expect(
      convertImageToWebp(Buffer.from("not-an-image")),
    ).rejects.toThrow();
  });
});
