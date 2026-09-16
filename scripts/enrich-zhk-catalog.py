#!/usr/bin/env python3
"""Parse Notion ЖК HTML and push catalog/internal payloads + covers."""

from __future__ import annotations

import argparse
import html
import io
import json
import os
import re
import zipfile
from pathlib import Path
from urllib.parse import unquote
from urllib.request import Request, urlopen

from PIL import Image

HTML_DIR = Path("/tmp/baza-zhk")
ZIP_PATH = Path("/tmp/notion-export.zip")
ZIP_PREFIX = "Private & Shared/База ЖК/"
SKIP_NAMES = {"База ЖК", "Untitled"}

INSTALLMENT_RE = re.compile(
    r"(?i)(?:на\s+)?(\d+)\s*(год(?:а)?|лет)\s*[-–—:]?\s*(без наценки|0\s*%|\d+\s*%)"
)
PRICE_RE = re.compile(
    r"(?i)(?:на\s+)?(?:ул\.|улиц[аеию]\s+)?([^\n,]{2,48}?)\s+(\d[\d\s]{1,6})\s*тыс"
)
HTTP_RE = re.compile(r"https?://[^\s\"'<>]+")
TAG_RE = re.compile(r"<[^>]+>")


def clean_text(raw: str) -> str:
    text = raw.replace("<br/>", "\n").replace("<br />", "\n").replace("<br>", "\n")
    text = TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


def property_map(article_html: str) -> dict[str, str]:
    props: dict[str, str] = {}
    header = article_html.split('<div class="page-body">', 1)[0]
    for row in re.finditer(r'<tr class="property-row[^"]*">(.*?)</tr>', header, re.S):
        chunk = row.group(1)
        th = clean_text(re.search(r"<th>(.*?)</th>", chunk, re.S).group(1) if re.search(r"<th>", chunk) else "")
        td = re.search(r"<td>(.*?)</td>", chunk, re.S)
        if not th or not td:
            continue
        if "checkbox-on" in td.group(1):
            props[th] = "Да"
        elif "checkbox-off" in td.group(1):
            props[th] = "Нет"
        else:
            props[th] = clean_text(td.group(1))
    return props


def split_sections(body: str) -> dict[str, str]:
    parts = re.split(r"<h2[^>]*>(.*?)</h2>", body, flags=re.S)
    sections: dict[str, str] = {}
    for i in range(1, len(parts), 2):
        title = re.sub(r"https?://\S+", "", clean_text(parts[i]))
        title = title.split("Каждый месяц")[0].strip()
        sections[title] = parts[i + 1] if i + 1 < len(parts) else ""
    return sections


def parse_comments(html_text: str) -> list[str]:
    comments: list[str] = []
    tails = html_text.split("Inline comments", 1)
    if len(tails) < 2:
        return comments
    for block in re.finditer(
        r'<div style="padding:0\.2em">(?!<span)(.*?)</div>', tails[1], re.S
    ):
        text = clean_text(block.group(1))
        if text and text.lower() not in {"block text"}:
            comments.append(text)
    return comments


def parse_terms(text: str, title: str) -> dict | None:
    items = []
    seen = set()
    for match in INSTALLMENT_RE.finditer(text):
        years, _, value = match.groups()
        label = f"{years} {match.group(2)}"
        value = "без наценки" if "без" in value.lower() else re.sub(r"\s+", "", value)
        key = (label, value)
        if key in seen:
            continue
        seen.add(key)
        items.append({"label": label, "value": value})
    if not items:
        return None
    leftover = INSTALLMENT_RE.sub("", text)
    leftover = re.sub(r"(?i)рассрочка[^\n]*", "", leftover)
    note_lines = []
    for line in leftover.splitlines():
        stripped = line.strip(" -•✔️🧱")
        if not stripped:
            continue
        if re.search(r"(?i)информац|улица|этажность|фасад|обязательн|мат капитал", stripped):
            continue
        if re.search(r"(?i)перерасчет|сдач|срок|наценк нет|без наценки на", stripped):
            note_lines.append(stripped)
    group = {"title": title, "items": items}
    if note_lines:
        group["note"] = "\n".join(dict.fromkeys(note_lines))[:280]
    return group


def parse_commercial(text: str) -> dict | None:
    items = []
    for match in PRICE_RE.finditer(text):
        label = clean_text(match.group(1)).strip(" .,-")
        amount = re.sub(r"\s+", "", match.group(2))
        value = f"{amount} тыс"
        if len(label) < 2:
            continue
        items.append({"label": label, "value": value})
    note_lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
        and not PRICE_RE.search(line)
        and not INSTALLMENT_RE.search(line)
    ]
    if not items and not note_lines:
        return None
    group = {"title": "Коммерция", "items": items}
    if note_lines:
        group["note"] = "\n".join(note_lines)[:500]
    return group


def parse_facts(text: str) -> list[dict[str, str]]:
    facts = []
    for raw in text.splitlines():
        line = raw.strip(" -•✔️🧱")
        low = line.lower()
        if low.startswith("этажность"):
            facts.append({"label": "Этажность", "value": re.sub(r"(?i)этажность\s*", "", line)})
        elif "фасад" in low:
            facts.append({"label": "Фасад", "value": line})
        elif "обязательн" in low and ("тыс" in low or "платеж" in low and any(ch.isdigit() for ch in line)):
            if "наценк" in low:
                continue
            facts.append({"label": "Обязательный платеж", "value": line})
        elif low.startswith(("улица", "ул.", "проспект", "пр.")):
            facts.append({"label": "Адрес", "value": line})
    uniq = []
    seen = set()
    for fact in facts:
        key = (fact["label"], fact["value"])
        if key in seen:
            continue
        seen.add(key)
        uniq.append(fact)
    return uniq[:8]


def about_text(info: str) -> str:
    keep = []
    for line in info.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if INSTALLMENT_RE.search(stripped):
            continue
        if re.match(r"(?i)рассрочка", stripped):
            continue
        if re.search(r"(?i)комисс|инвест|стоп-продаж|приостановлен|отложен", stripped):
            continue
        keep.append(re.sub(r"^[🧱✔️•\-\s]+", "", stripped))
        if len("\n".join(keep)) >= 520:
            break
    text = "\n".join(keep).strip()
    return text[:700].rsplit("\n", 1)[0] if len(text) > 700 else text


def classify_doc(url: str, section: str, title: str) -> str:
    blob = f"{section} {title} {url}".lower()
    if "2gis" in blob:
        return "map"
    if "шахмат" in blob:
        return "chess"
    if "коммерц" in blob:
        return "commercial"
    if "планир" in blob:
        return "plan"
    if "прайс" in blob or "spreadsheet" in blob or "docs.google" in blob:
        return "price"
    return "other"


def first_cover_src(body: str) -> str | None:
    for src in re.findall(r'<img[^>]+src="([^"]+)"', body):
        if "notion.so/icons" in src or src.startswith("data:") or "2gis" in src:
            continue
        if src.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            return unquote(src)
    return None


def parse_html(path: Path) -> dict | None:
    title = re.sub(r"\s+[0-9a-f]{32}$", "", path.stem).strip()
    if title in SKIP_NAMES or title.startswith("Untitled"):
        return None
    raw = path.read_text(encoding="utf-8")
    article = raw.split("<article", 1)[-1]
    props = property_map(article)
    body_split = article.split('<div class="page-body">', 1)
    body = body_split[1].split("Inline comments", 1)[0] if len(body_split) > 1 else ""
    sections = split_sections(body)
    comments = parse_comments(raw)

    info = clean_text(sections.get("Инфо о ЖК", ""))
    price = clean_text(sections.get("Прайс, условия", ""))
    location_html = sections.get("Расположение", "")
    plans_html = sections.get("Планировки", "")
    chess_html = "\n".join(v for k, v in sections.items() if k.startswith("Шахматка"))

    installment = []
    seen_terms = set()
    for source, heading in ((info, "Рассрочка"), (price, "Рассрочка по годам")):
        group = parse_terms(source, heading)
        if not group:
            continue
        signature = tuple((item["label"], item["value"]) for item in group["items"])
        if signature in seen_terms:
            if group.get("note") and not any(existing.get("note") for existing in installment):
                installment[0]["note"] = group["note"]
            continue
        seen_terms.add(signature)
        installment.append(group)

    commercial = []
    comm_text = ""
    if "Коммерция" in price:
        comm_text = price.split("Коммерция", 1)[1]
    elif "Коммерция" in info:
        comm_text = info.split("Коммерция", 1)[1]
    group = parse_commercial(comm_text or price)
    if group and (
        group["items"]
        or (group.get("note") and group["note"].strip() not in {"", "Коммерция"})
    ):
        commercial.append(group)

    map_url = next((u.rstrip(").,") for u in HTTP_RE.findall(location_html) if "2gis" in u), None)
    loc_title = None
    bookmark = re.search(r'class="bookmark-title">(.*?)</div>', location_html, re.S)
    if bookmark:
        loc_title = clean_text(bookmark.group(1))
    address = loc_title or props.get("Расположение")

    documents = []
    seen_urls = set()
    for section_name, chunk in (
        ("Планировки", plans_html),
        ("Шахматка", chess_html),
        ("Прайс, условия", sections.get("Прайс, условия", "")),
        ("Расположение", location_html),
    ):
        for href, label in re.findall(r'<a href="([^"]+)"[^>]*>(.*?)</a>', chunk, re.S):
            url = html.unescape(href)
            if not url.startswith("http"):
                continue
            name = clean_text(label) or url
            if url in seen_urls:
                continue
            seen_urls.add(url)
            documents.append(
                {
                    "title": name[:120],
                    "url": url,
                    "kind": classify_doc(url, section_name, name),
                }
            )

    commission_bits = []
    investor_bits = []
    stop_bits = []
    for comment in comments:
        low = comment.lower()
        if "инвест" in low:
            investor_bits.append(comment)
        elif "стоп" in low:
            stop_bits.append(comment)
        else:
            commission_bits.append(comment)
    if "отложен" in title.lower():
        stop_bits.append("Объект отложен")
    for line in (info + "\n" + props.get("Примечание", "")).splitlines():
        low = line.lower()
        if "инвест" in low:
            investor_bits.append(line.strip())
        if "стоп" in low and "продаж" in low:
            stop_bits.append(line.strip())
        if "приостановлен" in low or "отложен" in low:
            stop_bits.append(line.strip())

    catalog = {
        "about": about_text(info),
        "facts": parse_facts(info),
        "installment": installment,
        "commercial": commercial,
        "location": {k: v for k, v in {"address": address, "map_url": map_url}.items() if v},
        "documents": documents,
    }
    internal = {
        "commission": "\n".join(dict.fromkeys(commission_bits)).strip(),
        "investor": "\n".join(dict.fromkeys(investor_bits)).strip(),
        "stop_sales": "\n".join(dict.fromkeys(stop_bits)).strip(),
        "notes": props.get("Примечание", "").strip(),
    }
    internal = {k: v for k, v in internal.items() if v}

    return {
        "title": title,
        "cover_src": first_cover_src(body),
        "catalog": catalog,
        "internal": internal,
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
    image.thumbnail((1400, 900))
    out = io.BytesIO()
    image.save(out, format="WEBP", quality=72, method=4)
    return out.getvalue()


def load_env(path: Path) -> dict[str, str]:
    env = {}
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


def find_zip_image(zf: zipfile.ZipFile, title: str, cover_src: str | None) -> bytes | None:
    names = zf.namelist()
    candidates = []
    if cover_src:
        direct = ZIP_PREFIX + cover_src
        if direct in zf.namelist() and zf.getinfo(direct).file_size <= 4_500_000:
            candidates.append(direct)
        # folder-only match
        folder = ZIP_PREFIX + title + "/"
        leaf = Path(cover_src).name
        for name in names:
            if name.startswith(folder) and name.endswith(leaf):
                candidates.append(name)
    folder = ZIP_PREFIX + title + "/"
    preferred = []
    fallback = []
    for name in names:
        if not name.startswith(folder):
            continue
        low = name.lower()
        if not low.endswith((".jpg", ".jpeg", ".webp", ".png")):
            continue
        info = zf.getinfo(name)
        if info.file_size < 40_000 or info.file_size > 4_500_000:
            continue
        if any(skip in low for skip in ("image.png", "прайс", "price", "монтаж")):
            fallback.append(name)
            continue
        preferred.append(name)
    for name in candidates + preferred + fallback:
        try:
            return zf.read(name)
        except KeyError:
            continue
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-covers", action="store_true")
    parser.add_argument("--covers-only", action="store_true")
    args = parser.parse_args()

    records = []
    for path in sorted(HTML_DIR.glob("*.html")):
        parsed = parse_html(path)
        if parsed:
            records.append(parsed)
    print(f"parsed {len(records)} complexes", flush=True)

    if args.dry_run:
        sample = next(r for r in records if r["title"] == "8 марта")
        print(json.dumps(sample, ensure_ascii=False, indent=2)[:2500])
        return

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
        f"{base}/rest/v1/properties?select=id,title",
        "GET",
        headers,
    )
    def norm_title(value: str) -> str:
        return re.sub(r"[\s/|]+", " ", value.lower()).strip()

    by_title: dict[str, list[str]] = {}
    for row in existing:
        by_title.setdefault(norm_title(row["title"]), []).append(row["id"])

    zf = zipfile.ZipFile(ZIP_PATH) if ZIP_PATH.exists() and not args.skip_covers else None
    updated = 0
    covers = 0
    missing = []
    for record in records:
        property_ids = by_title.get(norm_title(record["title"]), [])
        if not property_ids:
            missing.append(record["title"])
            continue
        payload = {}
        if not args.covers_only:
            payload = {
                "catalog": record["catalog"],
                "internal": record["internal"],
                "description": record["catalog"].get("about") or None,
            }
        if zf is not None:
            raw = find_zip_image(zf, record["title"], record.get("cover_src"))
            if raw:
                webp = compress_image(raw)
                object_path = f"{property_ids[0]}.webp"
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
                    payload["cover_url"] = f"{base}/storage/v1/object/public/complexes/{object_path}"
                    covers += 1
                except Exception as exc:
                    print("cover failed", record["title"], type(exc).__name__, flush=True)
        if not payload:
            continue
        body = json.dumps(payload, ensure_ascii=False).encode()
        for property_id in property_ids:
            request_json(
                f"{base}/rest/v1/properties?id=eq.{property_id}",
                "PATCH",
                headers,
                body,
            )
            updated += 1
        if updated % 15 == 0:
            print(f"updated {updated}/{len(records)}", flush=True)

    print(f"done updated={updated} covers={covers} missing={missing}")


if __name__ == "__main__":
    main()
