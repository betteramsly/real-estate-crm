import { NextRequest, NextResponse } from "next/server";

function allowedPhotoUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname;
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    : null;
  const allowedHost =
    host === supabaseHost ||
    host.endsWith(".supabase.co") ||
    host === "images.unsplash.com";
  if (!allowedHost) return null;
  if (host.endsWith(".supabase.co") && !url.pathname.includes("/storage/")) {
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

  const upstream = await fetch(url.toString(), { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Не удалось скачать" }, { status: 502 });
  }

  const name = safeFileName(
    request.nextUrl.searchParams.get("name"),
    "foto.jpg",
  );
  const type = upstream.headers.get("content-type") ?? "application/octet-stream";

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
