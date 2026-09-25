#!/usr/bin/env python3
"""Upload Notion ЖК gallery photos into Supabase Storage and catalog.photos."""

from __future__ import annotations

import argparse
import html
import io
import json
import os
import re
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen

from PIL import Image

HTML_DIR = Path("/tmp/baza-zhk")
ZIP_PATH = Path("/tmp/notion-export.zip")
ZIP_PREFIX = "Private & Shared/База ЖК/"
SKIP_TITLES = {"База ЖК", "Untitled"}
SKIP_SRC = (
    "notion.so/icons",
    "data:",
    "2gis",
    "favicon",
    "yastatic",
    "yandex",
    "googleusercontent",
)
SKIP_NAME = ("прайс", "price", "монтаж", "image.png")
MAX_PHOTOS = 10


def clean_stem(path: Path) -> str:
    return re.sub(r"\s+[0-9a-f]{32}$", "", path.stem).strip()


def norm_title(value: str) -> str:
    return re.sub(r"[\s/|]+", " ", value.lower()).strip()


def gallery_srcs(body: str) -> list[str]:
    seen: set[str] = set()
    srcs: list[str] = []
    for raw in re.findall(r'<img[^>]+src="([^"]+)"', body):
        src = html.unescape(raw)
        low = src.lower()
        if any(token in low for token in SKIP_SRC):
            continue
        if not low.endswith((".png", ".jpg", ".jpeg", ".webp")):
            continue
        decoded = unquote(src)
        key = Path(decoded).name.lower()
        if key in seen:
            continue
        seen.add(key)
        srcs.append(decoded)
    return srcs[:MAX_PHOTOS]


def parse_html(path: Path) -> dict | None:
    title = clean_stem(path)
    if title in SKIP_TITLES or title.startswith("Untitled"):
        return None
    raw = path.read_text(encoding="utf-8")
    article = raw.split("<article", 1)[-1]
    body_split = article.split('<div class="page-body">', 1)
    body = body_split[1].split("Inline comments", 1)[0] if len(body_split) > 1 else ""
    return {"title": title, "srcs": gallery_srcs(body)}


def compress_image(data: bytes) -> bytes:
    image = Image.open(io.BytesIO(data))
    if image.mode in {"RGBA", "LA", "P"}:
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, (245, 245, 245))
        background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
        image = background
    else:
        image = image.convert("RGB")
    image.thumbnail((1600, 1200))
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=74, method=4)
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
    with urlopen(req, timeout=45) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else {}


def sign_in(url: str, anon: str, email: str, password: str) -> str:
    payload = json.dumps({"email": email, "password": password}).encode()
    data = request_json(
        f"{url}/auth/v1/token?grant_type=password",
        "POST",
        {"apikey": anon, "Content-Type": "application/json"},
        payload,
    )
    return data["access_token"]


def build_zip_index(names: list[str]) -> dict[str, list[str]]:
    index: dict[str, list[str]] = {}
    for name in names:
        if not name.startswith(ZIP_PREFIX) or name.endswith("/"):
            continue
        index.setdefault(Path(name).name.lower(), []).append(name)
    return index


def resolve_zip_name(
    names: set[str],
    index: dict[str, list[str]],
    title: str,
    src: str,
) -> str | None:
    direct = ZIP_PREFIX + src
    if direct in names:
        return direct
    folder = ZIP_PREFIX + title + "/"
    leaf = Path(src).name
    titled = folder + leaf
    if titled in names:
        return titled
    matches = index.get(leaf.lower(), [])
    if not matches:
        return None
    preferred = [name for name in matches if name.startswith(folder)]
    return (preferred or matches)[0]


def already_has_gallery(catalog: dict | None) -> bool:
    photos = (catalog or {}).get("photos")
    return isinstance(photos, list) and len(photos) >= 2


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    records = []
    for path in sorted(HTML_DIR.glob("*.html")):
        parsed = parse_html(path)
        if parsed:
            records.append(parsed)
    print(f"parsed {len(records)} pages", flush=True)

    import zipfile

    zf = zipfile.ZipFile(ZIP_PATH)
    names = zf.namelist()
    name_set = set(names)
    index = build_zip_index(names)

    if args.dry_run:
        found = 0
        missing = 0
        for record in records:
            resolved = [
                resolve_zip_name(name_set, index, record["title"], src)
                for src in record["srcs"]
            ]
            ok = sum(1 for item in resolved if item)
            found += ok
            missing += len(resolved) - ok
            if record["title"] in {"Авалон", "8 марта", "Фаворит"}:
                print(record["title"], "srcs", len(record["srcs"]), "found", ok)
        print(f"zip matches found={found} missing={missing}")
        return

    env = load_env(Path(__file__).resolve().parents[1] / ".env.local")
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    admin_email = os.environ.get("SUPABASE_ADMIN_EMAIL") or env.get("SUPABASE_ADMIN_EMAIL")
    admin_password = os.environ.get("SUPABASE_ADMIN_PASSWORD") or env.get(
        "SUPABASE_ADMIN_PASSWORD"
    )
    if not admin_email or not admin_password:
        raise RuntimeError(
            "Set SUPABASE_ADMIN_EMAIL and SUPABASE_ADMIN_PASSWORD outside the repository"
        )
    token = sign_in(base, anon, admin_email, admin_password)
    headers = {
        "apikey": anon,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    existing = request_json(
        f"{base}/rest/v1/properties?select=id,title,cover_url,catalog",
        "GET",
        headers,
    )
    by_title: dict[str, list[dict]] = {}
    for row in existing:
        by_title.setdefault(norm_title(row["title"]), []).append(row)

    updated = 0
    uploaded = 0
    skipped = 0
    missing_titles = []
    processed = 0
    for record in records:
        rows = by_title.get(norm_title(record["title"]), [])
        if not rows:
            missing_titles.append(record["title"])
            continue
        row = rows[0]
        if already_has_gallery(row.get("catalog")) and not args.force:
            skipped += 1
            continue

        photo_urls: list[str] = []
        cover = row.get("cover_url")
        srcs = record["srcs"]
        if cover:
            photo_urls.append(cover)
            srcs = srcs[1:]

        for src in srcs:
            if len(photo_urls) >= MAX_PHOTOS:
                break
            zip_name = resolve_zip_name(name_set, index, record["title"], src)
            if not zip_name:
                continue
            info = zf.getinfo(zip_name)
            low = zip_name.lower()
            if any(token in low for token in SKIP_NAME):
                continue
            if info.file_size < 20_000:
                continue
            try:
                raw = zf.read(zip_name)
                webp = compress_image(raw)
            except Exception as exc:
                print("compress failed", record["title"], type(exc).__name__, flush=True)
                continue

            object_path = f"{row['id']}/{len(photo_urls):02d}.webp"
            public_url = f"{base}/storage/v1/object/public/complexes/{object_path}"
            if public_url in photo_urls:
                continue
            upload = Request(
                f"{base}/storage/v1/object/complexes/{object_path}",
                data=webp,
                headers={
                    "apikey": anon,
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "image/webp",
                    "x-upsert": "true",
                },
                method="POST",
            )
            try:
                with urlopen(upload, timeout=60) as resp:
                    resp.read()
            except Exception as exc:
                print("upload failed", record["title"], object_path, type(exc).__name__, flush=True)
                continue
            photo_urls.append(public_url)
            uploaded += 1

        catalog = dict(row.get("catalog") or {})
        catalog["photos"] = photo_urls
        body = json.dumps({"catalog": catalog}, ensure_ascii=False).encode()
        for item in rows:
            request_json(
                f"{base}/rest/v1/properties?id=eq.{item['id']}",
                "PATCH",
                headers,
                body,
            )
            updated += 1
        processed += 1
        print(
            f"{processed} {record['title']}: {len(photo_urls)} photos",
            flush=True,
        )
        if args.limit and processed >= args.limit:
            break

    print(
        f"done updated={updated} uploaded={uploaded} skipped={skipped} missing={missing_titles}",
        flush=True,
    )


if __name__ == "__main__":
    main()
