#!/usr/bin/env python3
"""Re-upload gallery + location photos from Notion export by section."""

from __future__ import annotations

import html
import io
import json
import re
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen

from PIL import Image

HTML_DIR = Path("/tmp/baza-zhk")
ZIP_PATH = Path("/tmp/notion-export.zip")
ZIP_PREFIX = "Private & Shared/База ЖК/"
SKIP_TITLES = {"База ЖК", "Untitled"}
SKIP_SRC = ("notion.so/icons", "data:", "favicon", "yastatic")
MAX_GALLERY = 16
MAX_LOCATION = 6


def clean_stem(path: Path) -> str:
    return re.sub(r"\s+[0-9a-f]{32}$", "", path.stem).strip()


def norm_title(value: str) -> str:
    return re.sub(r"[\s/|]+", " ", value.lower()).strip()


def clean_heading(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    return " ".join(html.unescape(text).split()).lower()


def is_image_src(src: str) -> bool:
    low = src.lower()
    if any(token in low for token in SKIP_SRC):
        return False
    if low.startswith("http") and "2gis" in low and "getimage" in low:
        return True
    return low.endswith((".png", ".jpg", ".jpeg", ".webp"))


def collect_imgs(chunk: str) -> list[str]:
    srcs: list[str] = []
    seen: set[str] = set()
    for raw in re.findall(r'<img[^>]+src="([^"]+)"', chunk):
        src = unquote(html.unescape(raw))
        if not is_image_src(src):
            continue
        key = Path(src).name.lower()
        if key in seen:
            continue
        seen.add(key)
        srcs.append(src)
    return srcs


def parse_page(path: Path) -> dict | None:
    title = clean_stem(path)
    if title in SKIP_TITLES or title.startswith("Untitled"):
        return None
    raw = path.read_text(encoding="utf-8")
    article = raw.split("<article", 1)[-1]
    body_split = article.split('<div class="page-body">', 1)
    body = body_split[1].split("Inline comments", 1)[0] if len(body_split) > 1 else ""
    parts = re.split(r"<h2[^>]*>(.*?)</h2>", body, flags=re.S)
    gallery: list[str] = []
    location: list[str] = []
    for i in range(1, len(parts), 2):
        heading = clean_heading(parts[i])
        srcs = collect_imgs(parts[i + 1] if i + 1 < len(parts) else "")
        if heading.startswith("фото"):
            gallery.extend(srcs)
        elif heading.startswith("расположен"):
            location.extend(srcs)
    if not gallery:
        gallery = collect_imgs(body)
    return {
        "title": title,
        "gallery": gallery[:MAX_GALLERY],
        "location": location[:MAX_LOCATION],
    }


def compress_image(data: bytes) -> bytes:
    image = Image.open(io.BytesIO(data))
    if image.mode in {"RGBA", "LA", "P"}:
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, (245, 245, 245))
        background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
        image = background
    else:
        image = image.convert("RGB")
    image.thumbnail((1600, 1600))
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=76, method=4)
    return out.getvalue()


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"')
    return env


def request_json(url: str, method: str, headers: dict[str, str], body: bytes | None = None):
    req = Request(url, data=body, headers=headers, method=method)
    with urlopen(req, timeout=60) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else {}


def build_zip_index(names: list[str]) -> dict[str, list[str]]:
    index: dict[str, list[str]] = {}
    for name in names:
        if not name.startswith(ZIP_PREFIX) or name.endswith("/"):
            continue
        index.setdefault(Path(name).name.lower(), []).append(name)
    return index


def resolve_zip_name(names: set[str], index: dict[str, list[str]], title: str, src: str) -> str | None:
    if src.startswith("http"):
        return None
    direct = ZIP_PREFIX + src
    if direct in names:
        return direct
    folder = ZIP_PREFIX + title + "/"
    leaf = Path(src).name
    titled = folder + leaf
    if titled in names:
        return titled
    matches = index.get(leaf.lower(), [])
    preferred = [name for name in matches if name.startswith(folder)]
    return (preferred or matches)[0] if matches else None


def upload_webp(base: str, token: str, anon: str, object_path: str, data: bytes) -> str:
    req = Request(
        f"{base}/storage/v1/object/complexes/{object_path}",
        data=data,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "image/webp",
            "x-upsert": "true",
        },
        method="POST",
    )
    with urlopen(req, timeout=60) as resp:
        resp.read()
    return f"{base}/storage/v1/object/public/complexes/{object_path}"


def main() -> None:
    import zipfile

    records = [parsed for path in sorted(HTML_DIR.glob("*.html")) if (parsed := parse_page(path))]
    print(f"parsed {len(records)} pages", flush=True)
    zf = zipfile.ZipFile(ZIP_PATH)
    names = set(zf.namelist())
    index = build_zip_index(zf.namelist())

    env = load_env(Path(__file__).resolve().parents[1] / ".env.local")
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    token = request_json(
        f"{base}/auth/v1/token?grant_type=password",
        "POST",
        {"apikey": anon, "Content-Type": "application/json"},
        json.dumps({"email": "admin@demo.local", "password": "demo1234"}).encode(),
    )["access_token"]
    headers = {
        "apikey": anon,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    existing = request_json(f"{base}/rest/v1/properties?select=id,title,cover_url,catalog", "GET", headers)
    by_title: dict[str, list[dict]] = {}
    for row in existing:
        by_title.setdefault(norm_title(row["title"]), []).append(row)

    updated = 0
    uploaded = 0
    for record in records:
        rows = by_title.get(norm_title(record["title"]), [])
        if not rows:
            continue
        for row in rows:
            catalog = dict(row.get("catalog") or {})
            location = dict(catalog.get("location") or {})
            gallery_urls = list(catalog.get("photos") or [])
            if row.get("cover_url") and row["cover_url"] not in gallery_urls:
                gallery_urls = [row["cover_url"], *gallery_urls]
            location_urls = list(location.get("photos") or [])
            fill_gallery = len(gallery_urls) < 4

            for src in record["gallery"]:
                if not fill_gallery or len(gallery_urls) >= MAX_GALLERY:
                    break
                zip_name = resolve_zip_name(names, index, record["title"], src)
                if not zip_name:
                    continue
                object_path = f"{row['id']}/gallery/{len(gallery_urls):02d}.webp"
                public_url = f"{base}/storage/v1/object/public/complexes/{object_path}"
                if public_url in gallery_urls:
                    continue
                try:
                    webp = compress_image(zf.read(zip_name))
                    url = upload_webp(base, token, anon, object_path, webp)
                except Exception as exc:
                    print("gallery fail", record["title"], type(exc).__name__, flush=True)
                    continue
                gallery_urls.append(url)
                uploaded += 1

            for src in record["location"]:
                if src.startswith("http"):
                    if src not in location_urls and "favicon" not in src:
                        location_urls.append(src)
                    continue
                zip_name = resolve_zip_name(names, index, record["title"], src)
                if not zip_name:
                    continue
                object_path = f"{row['id']}/location/{len(location_urls):02d}.webp"
                public_url = f"{base}/storage/v1/object/public/complexes/{object_path}"
                if public_url in location_urls:
                    continue
                try:
                    webp = compress_image(zf.read(zip_name))
                    url = upload_webp(base, token, anon, object_path, webp)
                except Exception as exc:
                    print("location fail", record["title"], type(exc).__name__, flush=True)
                    continue
                location_urls.append(url)
                uploaded += 1

            next_catalog = dict(catalog)
            next_catalog["photos"] = gallery_urls
            if location_urls:
                location["photos"] = location_urls
                next_catalog["location"] = location
            if next_catalog == catalog:
                continue
            request_json(
                f"{base}/rest/v1/properties?id=eq.{row['id']}",
                "PATCH",
                headers,
                json.dumps({"catalog": next_catalog, "cover_url": gallery_urls[0] if gallery_urls else row.get("cover_url")}, ensure_ascii=False).encode(),
            )
            updated += 1
            print(
                f"{record['title']}: gallery={len(gallery_urls)} location={len(location_urls)}",
                flush=True,
            )

    print(f"done updated={updated} uploaded={uploaded}", flush=True)


if __name__ == "__main__":
    main()
