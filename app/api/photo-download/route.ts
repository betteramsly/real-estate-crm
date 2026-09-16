import { NextRequest, NextResponse } from "next/server";

const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 10_000;

export const maxDuration = 15;

function allowedPhotoUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;

  const host = url.hostname;
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : null;
  const allowedHost =
    host === supabaseHost ||
    host === "images.unsplash.com";
  if (!allowedHost) return null;
  if (host === supabaseHost && !url.pathname.includes("/storage/")) {
    return null;
  }
  return url;
}

function safeFileName(value: string | null, fallback: string) {
  const cleaned = (value || fallback)
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .slice(0, 120);
  return cleaned || fallback;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Нет фото" }, { status: 400 });
  }

  const url = allowedPhotoUrl(raw);
  if (!url) {
    return NextResponse.json({ error: "Нельзя скачать это фото" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "Скачивание заняло слишком много времени" : "Не удалось скачать" },
      { status: timedOut ? 504 : 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Не удалось скачать" }, { status: 502 });
  }

  const type = upstream.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("image/")) {
    await upstream.body.cancel();
    return NextResponse.json({ error: "Источник вернул не изображение" }, { status: 415 });
  }

  const contentLength = Number(upstream.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_PHOTO_BYTES) {
    await upstream.body.cancel();
    return NextResponse.json({ error: "Фото слишком большое" }, { status: 413 });
  }

  const name = safeFileName(
    request.nextUrl.searchParams.get("name"),
    "foto.jpg",
  );
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
