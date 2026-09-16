#!/usr/bin/env python3
"""Split Notion price screenshots out of the ЖК gallery into catalog.price_photos."""

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
SKIP_SRC = (
    "notion.so/icons",
    "data:",
    "2gis",
    "favicon",
    "yastatic",
    "yandex",
    "googleusercontent",
)
SKIP_NAME = ("монтаж",)
MAX_PHOTOS = 10
MAX_PRICE = 8


def clean_stem(path: Path) -> str:
    return re.sub(r"\s+[0-9a-f]{32}$", "", path.stem).strip()


def norm_title(value: str) -> str:
    return re.sub(r"[\s/|]+", " ", value.lower()).strip()


def clean_heading(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    return " ".join(html.unescape(text).split())


def is_image_src(src: str) -> bool:
    low = src.lower()
    if not low.endswith((".png", ".jpg", ".jpeg", ".webp")):
        return False
    return not any(token in low for token in SKIP_SRC)


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
    all_srcs = collect_imgs(body)
    gallery: list[str] = []
    prices: list[str] = []
    for i in range(1, len(parts), 2):
        heading = clean_heading(parts[i]).lower()
        srcs = collect_imgs(parts[i + 1] if i + 1 < len(parts) else "")
        if heading.startswith("фото"):
            gallery.extend(srcs)
        elif "прайс" in heading or heading in {"цены", "цена"}:
            prices.extend(srcs)
    if not gallery:
        gallery = [src for src in all_srcs if src not in prices]
    return {
        "title": title,
        "all_srcs": all_srcs[:MAX_PHOTOS],
        "gallery": gallery,
        "prices": prices[:MAX_PRICE],
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
    image.thumbnail((1800, 1800))
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


def replay_uploaded_srcs(
    title: str,
    all_srcs: list[str],
    cover: str | None,
    names: set[str],
    index: dict[str, list[str]],
    zf,
) -> list[str]:
    used: list[str] = []
    remaining = all_srcs
    if cover and all_srcs:
        used.append(all_srcs[0])
        remaining = all_srcs[1:]
    for src in remaining:
        if len(used) >= MAX_PHOTOS:
            break
        zip_name = resolve_zip_name(names, index, title, src)
        if not zip_name:
            continue
        low = zip_name.lower()
        if any(token in low for token in SKIP_NAME):
            continue
        if zf.getinfo(zip_name).file_size < 20_000 and "прайс" not in low:
            continue
        used.append(src)
    return used


def main() -> None:
    import zipfile

    records = []
    for path in sorted(HTML_DIR.glob("*.html")):
        parsed = parse_page(path)
        if parsed:
            records.append(parsed)
    print(f"parsed {len(records)} pages", flush=True)

    zf = zipfile.ZipFile(ZIP_PATH)
    names = zf.namelist()
    name_set = set(names)
    index = build_zip_index(names)

    env = load_env(Path(__file__).resolve().parents[1] / ".env.local")
    base = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    anon = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    token = sign_in(base, anon, "admin@demo.local", "demo1234")
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

    moved = 0
    uploaded = 0
    updated = 0
    for record in records:
        rows = by_title.get(norm_title(record["title"]), [])
        if not rows:
            continue
        row = rows[0]
        catalog = dict(row.get("catalog") or {})
        current_photos = list(catalog.get("photos") or [])
        if row.get("cover_url") and row["cover_url"] not in current_photos:
            current_photos = [row["cover_url"], *current_photos]

        used_srcs = replay_uploaded_srcs(
            record["title"],
            record["all_srcs"],
            row.get("cover_url"),
            name_set,
            index,
            zf,
        )
        price_leaves = {Path(src).name.lower() for src in record["prices"]}
        gallery_urls: list[str] = []
        price_urls: list[str] = list(catalog.get("price_photos") or [])
        for i, url in enumerate(current_photos):
            src = used_srcs[i] if i < len(used_srcs) else None
            leaf = Path(src).name.lower() if src else ""
            if src and leaf in price_leaves:
                if url not in price_urls:
                    price_urls.append(url)
                moved += 1
            elif url not in gallery_urls:
                gallery_urls.append(url)

        for src in record["prices"]:
            if len(price_urls) >= MAX_PRICE:
                break
            zip_name = resolve_zip_name(name_set, index, record["title"], src)
            if not zip_name:
                continue
            object_path = f"{row['id']}/price/{len(price_urls):02d}.webp"
            public_url = f"{base}/storage/v1/object/public/complexes/{object_path}"
            if public_url in price_urls:
                continue
            already = False
            leaf = Path(src).name.lower()
            for i, used in enumerate(used_srcs):
                if Path(used).name.lower() == leaf and i < len(current_photos):
                    if current_photos[i] not in price_urls:
                        price_urls.append(current_photos[i])
                    already = True
                    break
            if already:
                continue
            try:
                webp = compress_image(zf.read(zip_name))
            except Exception as exc:
                print("compress failed", record["title"], type(exc).__name__, flush=True)
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
            price_urls.append(public_url)
            uploaded += 1

        if gallery_urls == current_photos and price_urls == (catalog.get("price_photos") or []):
            continue
        catalog["photos"] = gallery_urls
        catalog["price_photos"] = price_urls
        body = json.dumps({"catalog": catalog}, ensure_ascii=False).encode()
        for item in rows:
            request_json(
                f"{base}/rest/v1/properties?id=eq.{item['id']}",
                "PATCH",
                headers,
                body,
            )
            updated += 1
        print(
            f"{record['title']}: gallery={len(gallery_urls)} prices={len(price_urls)}",
            flush=True,
        )

    print(f"done updated={updated} moved={moved} uploaded={uploaded}", flush=True)


if __name__ == "__main__":
    main()
