#!/usr/bin/env python3
"""Import missing residential complexes from a Notion Markdown export.

The importer is intentionally additive: existing ``properties`` rows are matched by
normalized title (and by developer/location when a source title is duplicated) and
are never updated. New rows and their media use deterministic IDs and paths, so an
interrupted import can be run again safely.

Credentials are read from the process environment or prompted for interactively.
They are never written to the repository.
"""

from __future__ import annotations

import argparse
import csv
import getpass
import hashlib
import html
import io
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
import uuid
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Iterator
from urllib.error import HTTPError
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageOps, ImageSequence


ZIP_PREFIX = "Private & Shared/База ЖК/"
SOURCE_NAMESPACE = uuid.UUID("a3284a07-3f20-4c3e-87aa-5b1cb8a4ed90")
MAX_STORAGE_BYTES = 10 * 1024 * 1024
IMAGE_SUFFIXES = {".gif", ".jpeg", ".jpg", ".png", ".webp"}
DOCUMENT_SUFFIXES = {".gif", ".jpeg", ".jpg", ".pdf", ".png", ".webp", ".xls", ".xlsx"}
CONVERTIBLE_SUFFIXES = {".docx", ".mp4"}
PROPERTY_KEYS = {
    ">85м2",
    "Актуальность",
    "Год сдачи",
    "Застройщик",
    "Информация о СК",
    "Кв.",
    "Мат. капитал",
    "Обратная связь",
    "Примечание",
    "Расположение",
    "Рассрочка (макс.)",
}
SKIP_TITLES = {"база жк", "untitled"}
INSTALLMENT_RE = re.compile(
    r"(?i)(?:на\s+)?(\d+)\s*(год(?:а)?|лет)\s*[-–—:]?\s*"
    r"(без\s+наценки|0\s*%|\d+\s*%)"
)
PRICE_RE = re.compile(
    r"(?i)(?:на\s+)?(?:ул\.|улиц[аеию]\s+)?([^\n,]{2,48}?)\s+"
    r"(\d[\d\s]{1,6})\s*тыс"
)


@dataclass(frozen=True)
class MarkdownLink:
    label: str
    target: str
    image: bool
    start: int
    end: int


@dataclass(frozen=True)
class AssetRef:
    target: str
    label: str
    category: str
    kind: str = "other"


@dataclass
class ParsedRecord:
    page_id: str
    title: str
    markdown_name: str
    metadata: dict[str, str]
    row: dict
    assets: list[AssetRef]
    asset_names: dict[AssetRef, str | None] = field(default_factory=dict)


class RemoteError(RuntimeError):
    def __init__(self, method: str, url: str, code: int, body: bytes):
        path = urlsplit(url).path
        detail = body.decode("utf-8", errors="replace")[:600]
        super().__init__(f"{method} {path} failed with HTTP {code}: {detail}")
        self.code = code
        self.body = body


def load_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def normalize_text(value: str | None) -> str:
    text = unicodedata.normalize("NFC", value or "").casefold().replace("ё", "е")
    return re.sub(r"[^a-zа-я0-9]+", " ", text).strip()


def normalize_heading(value: str) -> str:
    return re.sub(r"[*_`]+", "", value).strip()


def unique(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        key = unicodedata.normalize("NFC", item).strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def iter_markdown_links(text: str) -> Iterator[MarkdownLink]:
    """Yield Markdown links, including targets containing balanced parentheses."""
    pattern = re.compile(r"(!?)\[([^\]]*)\]\(")
    position = 0
    while match := pattern.search(text, position):
        depth = 1
        index = match.end()
        escaped = False
        while index < len(text) and depth:
            char = text[index]
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            index += 1
        if depth:
            break
        target = text[match.end() : index - 1].strip()
        yield MarkdownLink(
            label=html.unescape(match.group(2)).strip(),
            target=html.unescape(target).strip().strip("<>"),
            image=bool(match.group(1)),
            start=match.start(),
            end=index,
        )
        position = index


def clean_markdown(text: str) -> str:
    text = html.unescape(text)
    chunks: list[str] = []
    position = 0
    for link in iter_markdown_links(text):
        chunks.append(text[position : link.start])
        chunks.append("" if link.image else link.label)
        position = link.end
    chunks.append(text[position:])
    text = "".join(chunks)
    text = re.sub(r"<img\b[^>]*>", "", text, flags=re.I)
    text = re.sub(r"</?(?:aside|details|summary|div|span|table|tbody|tr|td|th|p)\b[^>]*>", "", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    lines: list[str] = []
    for raw in text.replace("\xa0", " ").splitlines():
        line = raw.strip()
        line = re.sub(r"^#{1,6}\s+", "", line)
        line = re.sub(r"^[>\-*+]\s*", "", line)
        line = re.sub(r"^\d+[.)]\s*", "", line)
        line = line.replace("**", "").replace("__", "").replace("`", "")
        line = re.sub(r"[ \t]+", " ", line).strip()
        if not line or line == "---":
            continue
        lines.append(line)
    return "\n".join(lines).strip()


def split_sections(markdown: str) -> dict[str, str]:
    matches = list(re.finditer(r"(?m)^##\s+(.+?)\s*$", markdown))
    sections: dict[str, str] = {}
    for index, match in enumerate(matches):
        name = normalize_heading(match.group(1))
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        sections[name] = markdown[match.end() : end]
    return sections


def parse_metadata(markdown: str) -> dict[str, str]:
    before_sections = re.split(r"(?m)^##\s+", markdown, maxsplit=1)[0]
    before_sections = before_sections.split("<aside>", 1)[0]
    result: dict[str, str] = {}
    current: str | None = None
    for raw in before_sections.splitlines()[1:]:
        line = raw.strip()
        match = re.match(r"^([^:]{1,40}):\s*(.*)$", line)
        if match and match.group(1).strip() in PROPERTY_KEYS:
            current = match.group(1).strip()
            result[current] = match.group(2).strip()
            continue
        if current and line and not line.startswith("<"):
            result[current] = f"{result[current]}\n{line}".strip()
    return result


def classify_document(section: str, label: str, target: str) -> str:
    blob = normalize_text(f"{section} {label} {unquote(target)}")
    if any(token in blob for token in ("2gis", "яндекс карт", "google map", "карта")):
        return "map"
    if "шахмат" in blob:
        return "chess"
    if "коммерц" in blob or "паркинг" in blob:
        return "commercial"
    if "планир" in blob or "планировки" in normalize_text(section):
        return "plan"
    if any(token in blob for token in ("прайс", "условия", "spreadsheet", "таблиц")):
        return "price"
    return "other"


def asset_category(section: str, link: MarkdownLink) -> tuple[str, str]:
    section_key = normalize_text(section)
    kind = classify_document(section, link.label, link.target)
    if not link.image:
        return "document", kind
    if section_key == "расположение":
        return "location", kind
    if section_key == "прайс условия":
        return "price", kind
    if section_key in {"планировки", "шахматка"}:
        return "document", kind
    return "gallery", kind


def is_external(target: str) -> bool:
    return target.lower().startswith(("http://", "https://", "mailto:", "tel:"))


def document_title(label: str, target: str) -> str:
    title = unquote(label or PurePosixPath(unquote(target)).name)
    title = re.sub(r"[_\s]+", " ", title).strip()
    if Path(unquote(target)).suffix.casefold() == ".mp4":
        title = f"Видео — {title}"
    return title[:200] or "Документ"


def external_documents(sections: dict[str, str]) -> list[dict[str, str]]:
    documents: list[dict[str, str]] = []
    seen: set[str] = set()
    for section, chunk in sections.items():
        for link in iter_markdown_links(chunk):
            if link.image or not is_external(link.target):
                continue
            url = link.target.strip()
            if url in seen or "forms.gle/" in url or "app.notion.com/" in url:
                continue
            seen.add(url)
            documents.append(
                {
                    "title": document_title(link.label, url),
                    "url": url[:2048],
                    "kind": classify_document(section, link.label, url),
                }
            )
    return documents[:100]


def local_assets(sections: dict[str, str]) -> list[AssetRef]:
    result: list[AssetRef] = []
    seen: set[tuple[str, str]] = set()
    for section, chunk in sections.items():
        for link in iter_markdown_links(chunk):
            if is_external(link.target):
                continue
            category, kind = asset_category(section, link)
            key = (link.target, category)
            if key in seen:
                continue
            seen.add(key)
            result.append(
                AssetRef(
                    target=link.target,
                    label=document_title(link.label, link.target),
                    category=category,
                    kind=kind,
                )
            )
    return result


def parse_bool(value: str | None) -> bool | None:
    key = normalize_text(value)
    if key in {"да", "yes", "true", "есть"}:
        return True
    if key in {"нет", "no", "false"}:
        return False
    return None


def parse_relevance(value: str | None) -> int | None:
    count = (value or "").count("⭐")
    return count if count in {1, 2, 3} else None


def parse_rooms(value: str | None) -> int | None:
    match = re.search(r"\d+", value or "")
    if not match:
        return None
    rooms = int(match.group())
    return rooms if 1 <= rooms <= 4 else None


def infer_city(location: str | None) -> str | None:
    key = normalize_text(location)
    if not key:
        return None
    for city in ("Гудермес", "Самашки", "Аргун", "Шали", "Урус-Мартан", "Ачхой-Мартан"):
        if normalize_text(city) in key:
            return city
    return "Грозный"


def parse_cash_payment(text: str) -> bool | None:
    key = normalize_text(text)
    if "безналич" in key:
        return False
    if re.search(r"\bналичн(?:ая|ые|ый|ыми|ой|ого|ый расчет|ый расчёт)", key):
        return True
    return None


def parse_facts(text: str) -> list[dict[str, str]]:
    facts: list[dict[str, str]] = []
    for raw in text.splitlines():
        line = raw.strip(" -•✔️🧱")
        key = normalize_text(line)
        if key.startswith("этажность"):
            value = re.sub(r"(?i)^этажность\s*[:—-]?\s*", "", line)
            facts.append({"label": "Этажность", "value": value[:1000]})
        elif "фасад" in key:
            facts.append({"label": "Фасад", "value": line[:1000]})
        elif "обязательн" in key and ("платеж" in key or "тыс" in key):
            facts.append({"label": "Обязательный платеж", "value": line[:1000]})
        elif re.match(r"(?i)^(улица|ул\.|проспект|пр\.)", line):
            facts.append({"label": "Адрес", "value": line[:1000]})
    deduped: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for fact in facts:
        key = (fact["label"], fact["value"])
        if key not in seen:
            seen.add(key)
            deduped.append(fact)
    return deduped[:100]


def parse_installment(text: str, installment_max: str | None) -> list[dict] | None:
    items: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for match in INSTALLMENT_RE.finditer(text):
        years, unit, value = match.groups()
        item = {
            "label": f"{years} {unit}",
            "value": "без наценки" if "без" in value.casefold() else re.sub(r"\s+", "", value),
        }
        signature = (item["label"], item["value"])
        if signature not in seen:
            seen.add(signature)
            items.append(item)
    if not items and installment_max:
        items.append({"label": "Максимальный срок", "value": installment_max[:1000]})
    note_lines = []
    for line in text.splitlines():
        key = normalize_text(line)
        if any(token in key for token in ("рассроч", "наценк", "первоначальн", "обязательн", "ежемесяч")):
            note_lines.append(line.strip())
    note = "\n".join(unique(note_lines))[:3000].strip()
    if not items and not note:
        return None
    group: dict[str, object] = {"title": "Рассрочка", "items": items[:100]}
    if note:
        group["note"] = note
    return [group]


def commercial_chunks(sections: dict[str, str]) -> str:
    chunks: list[str] = []
    for section, raw in sections.items():
        parts = re.split(r"(?m)^###\s+(.+?)\s*$", raw)
        for index in range(1, len(parts), 2):
            heading = normalize_heading(parts[index])
            if "коммерц" not in normalize_text(heading) and "паркинг" not in normalize_text(heading):
                continue
            body = parts[index + 1] if index + 1 < len(parts) else ""
            chunks.append(f"{heading}\n{clean_markdown(body)}".strip())
        if "коммерц" in normalize_text(section):
            chunks.append(clean_markdown(raw))
    return "\n".join(unique(chunks)).strip()


def parse_commercial(text: str) -> list[dict] | None:
    if not text:
        return None
    items: list[dict[str, str]] = []
    for match in PRICE_RE.finditer(text):
        label = match.group(1).strip(" .,-")
        if len(label) >= 2:
            amount = re.sub(r"\s+", "", match.group(2))
            items.append(
                {
                    "label": label[:160],
                    "value": f"{amount} тыс",
                }
            )
    group: dict[str, object] = {"title": "Коммерция", "items": items[:100]}
    clean = text[:3000].strip()
    if clean:
        group["note"] = clean
    return [group]


def location_data(chunk: str, fallback: str | None) -> tuple[str | None, str | None]:
    map_url: str | None = None
    address: str | None = None
    for link in iter_markdown_links(chunk):
        if not is_external(link.target):
            continue
        key = normalize_text(f"{link.label} {link.target}")
        if any(token in key for token in ("2gis", "yandex", "яндекс", "google map", "карта")):
            map_url = link.target[:2048]
            if link.label and not is_external(link.label) and normalize_text(link.label) not in {"2gis", "карта"}:
                address = link.label[:500]
            break
    clean = clean_markdown(chunk)
    if not address:
        for line in clean.splitlines():
            key = normalize_text(line)
            if not key or key in {"расположение", "карта", "2gis"} or is_external(line):
                continue
            if len(line) <= 500:
                address = line
                break
    return address or fallback, map_url


def internal_payload(metadata: dict[str, str], sections: dict[str, str], page_id: str) -> dict:
    note = metadata.get("Примечание", "").strip()
    info = clean_markdown(sections.get("Инфо о ЖК", ""))
    lines = unique([line.strip() for line in f"{note}\n{info}".splitlines() if line.strip()])
    commission = [line for line in lines if "комисс" in normalize_text(line)]
    investor = [line for line in lines if "инвест" in normalize_text(line)]
    stop_sales = [
        line
        for line in lines
        if any(token in normalize_text(line) for token in ("стоп продаж", "приостанов", "отложен"))
    ]
    result: dict[str, object] = {
        "notion_page_id": page_id,
        "source": "Notion Markdown export 2026-09-30",
    }
    if note:
        result["notes"] = note
    if commission:
        result["commission"] = "\n".join(commission)
    if investor:
        result["investor"] = "\n".join(investor)
    if stop_sales:
        result["stop_sales"] = "\n".join(stop_sales)
    return result


def build_record(markdown_name: str, markdown: str) -> ParsedRecord | None:
    first_line = next((line for line in markdown.splitlines() if line.strip()), "")
    title = normalize_heading(re.sub(r"^#\s+", "", first_line)).strip()
    title = unicodedata.normalize("NFC", title)
    if normalize_text(title) in SKIP_TITLES:
        return None
    page_match = re.search(r"\s([0-9a-f]{32})\.md$", markdown_name, re.I)
    if not page_match:
        raise ValueError(f"Notion page ID not found in {markdown_name}")
    page_id = page_match.group(1).lower()
    metadata = parse_metadata(markdown)
    sections = split_sections(markdown)
    info = clean_markdown(sections.get("Инфо о ЖК", ""))
    price = clean_markdown(sections.get("Прайс, условия", ""))
    note = metadata.get("Примечание", "")
    address, map_url = location_data(
        sections.get("Расположение", ""), metadata.get("Расположение")
    )
    documents = external_documents(sections)
    installment = parse_installment(
        f"{info}\n{price}\n{note}", metadata.get("Рассрочка (макс.)")
    )
    commercial = parse_commercial(commercial_chunks(sections))
    catalog: dict[str, object] = {
        "location": {key: value for key, value in {"address": address, "map_url": map_url}.items() if value},
        "documents": documents,
        "photos": [],
        "price_photos": [],
    }
    if info:
        catalog["about"] = info[:10_000]
    facts = parse_facts(info)
    if facts:
        catalog["facts"] = facts
    if installment:
        catalog["installment"] = installment
    if commercial:
        catalog["commercial"] = commercial

    location = metadata.get("Расположение")
    all_text = f"{note}\n{info}\n{price}"
    row = {
        "id": str(uuid.uuid5(SOURCE_NAMESPACE, f"notion-zhk:{page_id}")),
        "title": title[:180],
        "property_type": "apartment",
        "listing_type": "sale",
        "status": "active",
        "price": 0,
        "area": None,
        "rooms": parse_rooms(metadata.get("Кв.")),
        "address": address[:500] if address else None,
        "city": infer_city(location),
        "district": location[:100] if location else None,
        "description": info[:10_000] or None,
        "cover_url": None,
        "developer": (metadata.get("Застройщик") or "").strip()[:160] or None,
        "completion_year": (metadata.get("Год сдачи") or "").strip()[:80] or None,
        "installment_max": (metadata.get("Рассрочка (макс.)") or "").strip()[:80] or None,
        "maternity_capital": parse_bool(metadata.get("Мат. капитал")),
        "cash_payment": parse_cash_payment(all_text),
        "has_large_apartments": parse_bool(metadata.get(">85м2")),
        "relevance": parse_relevance(metadata.get("Актуальность")),
        "catalog": catalog,
        "internal": internal_payload(metadata, sections, page_id),
    }
    return ParsedRecord(
        page_id=page_id,
        title=title,
        markdown_name=markdown_name,
        metadata=metadata,
        row=row,
        assets=local_assets(sections),
    )


class ZipIndex:
    def __init__(self, zf: zipfile.ZipFile):
        self.zf = zf
        self.names = [name for name in zf.namelist() if not name.endswith("/")]
        self.by_normalized: dict[str, list[str]] = defaultdict(list)
        self.by_leaf: dict[str, list[str]] = defaultdict(list)
        for name in self.names:
            self.by_normalized[self._key(name)].append(name)
            self.by_leaf[self._key(PurePosixPath(name).name)].append(name)

    @staticmethod
    def _key(value: str) -> str:
        return unicodedata.normalize("NFC", value).casefold()

    @staticmethod
    def _variants(target: str) -> list[str]:
        raw = target.split("#", 1)[0].strip().lstrip("./")
        variants = [raw]
        for _ in range(3):
            decoded = unquote(variants[-1])
            if decoded == variants[-1]:
                break
            variants.append(decoded)
        return unique([variant.replace("\\", "/") for variant in variants])

    def resolve(self, markdown_name: str, target: str) -> str | None:
        md_dir = str(PurePosixPath(markdown_name).parent)
        for variant in self._variants(target):
            candidates = [f"{md_dir}/{variant}"]
            if variant.startswith("Private & Shared/"):
                candidates.append(variant)
            else:
                candidates.append(f"{ZIP_PREFIX}{variant}")
            for candidate in candidates:
                matches = self.by_normalized.get(self._key(candidate), [])
                if matches:
                    return matches[0]

        leaves = [PurePosixPath(variant).name for variant in self._variants(target)]
        candidates: list[str] = []
        for leaf in leaves:
            candidates.extend(self.by_leaf.get(self._key(leaf), []))
        candidates = unique(candidates)
        if not candidates:
            return None
        page_stem = re.sub(r"\s+[0-9a-f]{32}$", "", PurePosixPath(markdown_name).stem, flags=re.I)
        preferred = [
            name
            for name in candidates
            if normalize_text(page_stem) in normalize_text(str(PurePosixPath(name).parent))
        ]
        return (preferred or candidates)[0]


def read_records(zf: zipfile.ZipFile) -> tuple[list[ParsedRecord], ZipIndex]:
    index = ZipIndex(zf)
    records: list[ParsedRecord] = []
    for name in sorted(index.names):
        if not name.startswith(ZIP_PREFIX) or not name.endswith(".md"):
            continue
        record = build_record(name, zf.read(name).decode("utf-8-sig"))
        if record:
            records.append(record)
    for record in records:
        record.asset_names = {
            asset: index.resolve(record.markdown_name, asset.target) for asset in record.assets
        }
    return records, index


def source_profile(records: list[ParsedRecord], zf: zipfile.ZipFile) -> dict:
    title_counts = Counter(normalize_text(record.title) for record in records)
    unresolved = [
        (record.title, asset.target)
        for record in records
        for asset, name in record.asset_names.items()
        if name is None
    ]
    categories = Counter(asset.category for record in records for asset in record.assets)
    local_bytes = sum(
        zf.getinfo(name).file_size
        for record in records
        for name in record.asset_names.values()
        if name is not None
    )
    return {
        "records": len(records),
        "duplicate_titles": {
            key: count for key, count in sorted(title_counts.items()) if count > 1
        },
        "assets": dict(sorted(categories.items())),
        "resolved_assets": sum(
            name is not None for record in records for name in record.asset_names.values()
        ),
        "unresolved_assets": len(unresolved),
        "unresolved_examples": unresolved[:20],
        "referenced_bytes": local_bytes,
    }


class SupabaseClient:
    def __init__(self, base: str, anon: str, token: str):
        self.base = base.rstrip("/")
        self.anon = anon
        self.token = token

    @property
    def headers(self) -> dict[str, str]:
        return {"apikey": self.anon, "Authorization": f"Bearer {self.token}"}

    def request(
        self,
        path: str,
        method: str = "GET",
        body: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[bytes, dict[str, str]]:
        url = f"{self.base}{path}"
        request_headers = {**self.headers, **(headers or {})}
        request = Request(url, data=body, headers=request_headers, method=method)
        try:
            with urlopen(request, timeout=90) as response:
                return response.read(), dict(response.headers)
        except HTTPError as error:
            payload = error.read()
            raise RemoteError(method, url, error.code, payload) from error

    def json(
        self,
        path: str,
        method: str = "GET",
        payload: object | None = None,
        prefer: str | None = None,
    ):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {"Content-Type": "application/json"}
        if prefer:
            headers["Prefer"] = prefer
        raw, _ = self.request(path, method, body, headers)
        return json.loads(raw) if raw else None

    def upload(self, path: str, content: bytes, content_type: str) -> bool:
        encoded = quote(path, safe="/")
        try:
            self.request(
                f"/storage/v1/object/complexes/{encoded}",
                "POST",
                content,
                {"Content-Type": content_type, "x-upsert": "false"},
            )
            return True
        except RemoteError as error:
            message = error.body.decode("utf-8", errors="replace").casefold()
            if error.code == 400 and ("duplicate" in message or "already exists" in message):
                return False
            raise

    def remove(self, paths: list[str]) -> None:
        if not paths:
            return
        self.json(
            "/storage/v1/object/complexes",
            "DELETE",
            {"prefixes": paths},
        )


def sign_in(base: str, anon: str, email: str, password: str) -> str:
    url = f"{base.rstrip('/')}/auth/v1/token?grant_type=password"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    request = Request(
        url,
        data=payload,
        headers={"apikey": anon, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=45) as response:
            data = json.loads(response.read())
    except HTTPError as error:
        raise RemoteError("POST", url, error.code, error.read()) from error
    return data["access_token"]


def authenticate(repo_root: Path) -> tuple[SupabaseClient, dict]:
    env = {**load_env(repo_root / ".env.local"), **os.environ}
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    anon = env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "").strip()
    if not base or not anon:
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
    email = env.get("SUPABASE_ADMIN_EMAIL", "").strip() or input("Supabase admin email: ").strip()
    password = env.get("SUPABASE_ADMIN_PASSWORD") or getpass.getpass("Supabase admin password: ")
    token = sign_in(base, anon, email, password)
    client = SupabaseClient(base, anon, token)
    user = client.json("/auth/v1/user")
    profiles = client.json(
        "/rest/v1/profiles?" + urlencode({"select": "id,role,is_owner", "id": f"eq.{user['id']}"})
    )
    if not profiles or profiles[0].get("role") != "admin":
        raise RuntimeError("The authenticated Supabase user is not an admin")
    return client, user


def fetch_existing(client: SupabaseClient) -> list[dict]:
    select = "id,title,developer,district,city,completion_year,catalog,internal,cover_url"
    return client.json("/rest/v1/properties?" + urlencode({"select": select, "order": "created_at.asc"})) or []


def match_score(record: ParsedRecord, existing: dict) -> int:
    fields = (
        (record.row.get("developer"), existing.get("developer")),
        (record.row.get("district"), existing.get("district")),
        (record.row.get("completion_year"), existing.get("completion_year")),
    )
    score = 0
    for source, current in fields:
        if source and current and normalize_text(str(source)) == normalize_text(str(current)):
            score += 1
    page_id = (existing.get("internal") or {}).get("notion_page_id")
    if page_id == record.page_id:
        score += 10
    return score


def find_missing(records: list[ParsedRecord], existing: list[dict]) -> tuple[list[ParsedRecord], dict[str, str]]:
    source_groups: dict[str, list[ParsedRecord]] = defaultdict(list)
    existing_groups: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        source_groups[normalize_text(record.title)].append(record)
    for row in existing:
        existing_groups[normalize_text(row.get("title"))].append(row)

    missing: list[ParsedRecord] = []
    matched: dict[str, str] = {}
    for title_key, source_rows in source_groups.items():
        current_rows = existing_groups.get(title_key, [])
        if len(source_rows) == 1 and current_rows:
            record = source_rows[0]
            best = max(current_rows, key=lambda row: match_score(record, row))
            matched[record.page_id] = best["id"]
            continue

        unused = set(range(len(current_rows)))
        ranked: list[tuple[int, int, int]] = []
        for source_index, record in enumerate(source_rows):
            for current_index, row in enumerate(current_rows):
                ranked.append((match_score(record, row), source_index, current_index))
        assigned_source: set[int] = set()
        for score, source_index, current_index in sorted(ranked, reverse=True):
            if current_index not in unused or source_index in assigned_source:
                continue
            if score <= 0 and len(source_rows) > 1:
                continue
            unused.remove(current_index)
            assigned_source.add(source_index)
            matched[source_rows[source_index].page_id] = current_rows[current_index]["id"]
        for source_index, record in enumerate(source_rows):
            if source_index not in assigned_source:
                missing.append(record)
    return missing, matched


def mime_for(name: str) -> str:
    suffix = Path(unquote(name)).suffix.casefold()
    explicit = {
        ".gif": "image/gif",
        ".jpeg": "image/jpeg",
        ".jpg": "image/jpeg",
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".webp": "image/webp",
        ".xls": "application/vnd.ms-excel",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    return explicit.get(suffix) or mimetypes.guess_type(unquote(name))[0] or "application/octet-stream"


def compress_image(content: bytes) -> bytes:
    for edge, quality in ((3200, 88), (3200, 84), (2800, 82), (2400, 80), (1920, 78)):
        with Image.open(io.BytesIO(content)) as source:
            animated = bool(getattr(source, "is_animated", False) and source.n_frames > 1)
            frames: list[Image.Image] = []
            durations: list[int] = []
            for frame in ImageSequence.Iterator(source):
                image = ImageOps.exif_transpose(frame.copy())
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
                frames.append(image)
                durations.append(frame.info.get("duration", source.info.get("duration", 100)))
                if not animated:
                    break
            output = io.BytesIO()
            frames[0].save(
                output,
                format="WEBP",
                quality=quality,
                method=6,
                save_all=animated,
                append_images=frames[1:] if animated else [],
                duration=durations if animated else None,
                loop=source.info.get("loop", 0),
                minimize_size=animated,
            )
            result = output.getvalue()
            if len(result) <= MAX_STORAGE_BYTES:
                return result
    raise RuntimeError("WebP remains larger than the 10 MB bucket limit")


def convert_docx_to_pdf(content: bytes, source_name: str) -> bytes:
    soffice = shutil.which("soffice")
    if not soffice:
        raise RuntimeError("LibreOffice is required to convert a DOCX attachment")
    with tempfile.TemporaryDirectory(prefix="notion-docx-") as directory:
        root = Path(directory)
        input_path = root / (Path(unquote(source_name)).stem + ".docx")
        profile = root / "lo-profile"
        profile.mkdir()
        input_path.write_bytes(content)
        subprocess.run(
            [
                soffice,
                "--headless",
                f"-env:UserInstallation={profile.as_uri()}",
                "--convert-to",
                "pdf",
                "--outdir",
                str(root),
                str(input_path),
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=120,
        )
        output_path = root / f"{input_path.stem}.pdf"
        if not output_path.is_file() or not output_path.stat().st_size:
            raise RuntimeError(f"DOCX conversion produced no PDF: {source_name}")
        return output_path.read_bytes()


def convert_video_to_gif(content: bytes) -> bytes:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to convert an MP4 attachment")
    attempts = ((4, 480, 128), (3, 480, 96), (3, 400, 96), (2, 400, 64))
    with tempfile.TemporaryDirectory(prefix="notion-video-") as directory:
        root = Path(directory)
        input_path = root / "source.mp4"
        output_path = root / "preview.gif"
        input_path.write_bytes(content)
        for fps, width, colors in attempts:
            if output_path.exists():
                output_path.unlink()
            filters = (
                f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];"
                f"[s0]palettegen=max_colors={colors}[p];"
                "[s1][p]paletteuse=dither=bayer"
            )
            subprocess.run(
                [
                    ffmpeg,
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(input_path),
                    "-an",
                    "-filter_complex",
                    filters,
                    str(output_path),
                ],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=180,
            )
            if output_path.is_file() and output_path.stat().st_size <= MAX_STORAGE_BYTES:
                return output_path.read_bytes()
    raise RuntimeError("MP4 preview remains larger than the 10 MB bucket limit")


def public_url(client: SupabaseClient, path: str) -> str:
    return f"{client.base}/storage/v1/object/public/complexes/{quote(path, safe='/')}"


def prepare_asset(
    zf: zipfile.ZipFile,
    zip_name: str,
    category: str,
    property_id: str,
) -> tuple[str, bytes, str]:
    raw = zf.read(zip_name)
    suffix = Path(unquote(zip_name)).suffix.casefold()
    folder = "docs" if category == "document" else category
    if suffix == ".docx":
        content = convert_docx_to_pdf(raw, zip_name)
        extension = ".pdf"
        content_type = "application/pdf"
    elif suffix == ".mp4":
        content = compress_image(convert_video_to_gif(raw))
        extension = ".webp"
        content_type = "image/webp"
    elif suffix in IMAGE_SUFFIXES:
        content = compress_image(raw)
        extension = ".webp"
        content_type = "image/webp"
    else:
        if suffix not in DOCUMENT_SUFFIXES:
            raise ValueError(f"Unsupported document type: {zip_name}")
        content = raw
        extension = suffix
        content_type = mime_for(zip_name)
    if len(content) > MAX_STORAGE_BYTES:
        raise ValueError(f"File exceeds the 10 MB bucket limit after processing: {zip_name}")
    digest = hashlib.sha256(content).hexdigest()[:24]
    path = f"{property_id}/{folder}/{digest}{extension}"
    return path, content, content_type


def add_local_media(
    client: SupabaseClient,
    zf: zipfile.ZipFile,
    record: ParsedRecord,
) -> tuple[dict, list[str], int]:
    catalog = json.loads(json.dumps(record.row["catalog"], ensure_ascii=False))
    uploaded_paths: list[str] = []
    upload_count = 0
    documents = list(catalog.get("documents") or [])
    photos: list[str] = []
    prices: list[str] = []
    locations: list[str] = []

    for asset in record.assets:
        zip_name = record.asset_names.get(asset)
        if not zip_name:
            raise ValueError(f"Unresolved asset for {record.title}: {asset.target}")
        path, content, content_type = prepare_asset(
            zf, zip_name, asset.category, record.row["id"]
        )
        created = client.upload(path, content, content_type)
        if created:
            uploaded_paths.append(path)
            upload_count += 1
        url = public_url(client, path)
        if asset.category == "gallery":
            photos.append(url)
        elif asset.category == "price":
            prices.append(url)
        elif asset.category == "location":
            locations.append(url)
        else:
            documents.append({"title": asset.label[:200], "url": url, "kind": asset.kind})

    catalog["photos"] = unique(photos)[:200]
    catalog["price_photos"] = unique(prices)[:200]
    location = dict(catalog.get("location") or {})
    location["photos"] = unique(locations)[:200]
    catalog["location"] = location
    unique_documents: list[dict] = []
    seen_urls: set[str] = set()
    for document in documents:
        if not document.get("url") or document["url"] in seen_urls:
            continue
        seen_urls.add(document["url"])
        unique_documents.append(document)
    catalog["documents"] = unique_documents[:100]
    return catalog, uploaded_paths, upload_count


def insert_record(
    client: SupabaseClient,
    zf: zipfile.ZipFile,
    record: ParsedRecord,
    user_id: str,
) -> tuple[dict, int]:
    catalog: dict | None = None
    uploaded_paths: list[str] = []
    try:
        catalog, uploaded_paths, upload_count = add_local_media(client, zf, record)
        row = {
            **record.row,
            "catalog": catalog,
            "cover_url": (catalog.get("photos") or [None])[0],
            "assigned_to": user_id,
            "created_by": user_id,
        }
        created = client.json(
            "/rest/v1/properties",
            "POST",
            row,
            prefer="return=representation",
        )
        if not isinstance(created, list) or len(created) != 1:
            raise RuntimeError(f"Unexpected insert response for {record.title}")
    except Exception:
        client.remove(uploaded_paths)
        raise

    try:
        client.json(
            "/rest/v1/activities",
            "POST",
            {
                "entity_type": "property",
                "entity_id": record.row["id"],
                "type": "created",
                "payload": {"title": record.title, "source": "Notion import"},
                "property_id": record.row["id"],
                "actor_id": user_id,
            },
            prefer="return=minimal",
        )
    except Exception as error:
        print(f"warning: activity log failed for {record.title}: {error}", file=sys.stderr)
    return created[0], upload_count


def verify_created(client: SupabaseClient, created_ids: list[str]) -> list[dict]:
    if not created_ids:
        return []
    ids = ",".join(created_ids)
    query = urlencode(
        {
            "select": "id,title,developer,district,cover_url,catalog,internal",
            "id": f"in.({ids})",
        }
    )
    rows = client.json(f"/rest/v1/properties?{query}") or []
    found = {row["id"] for row in rows}
    missing = [property_id for property_id in created_ids if property_id not in found]
    if missing:
        raise RuntimeError(f"Verification failed; created rows not readable: {missing}")
    for row in rows:
        internal = row.get("internal") or {}
        catalog = row.get("catalog") or {}
        if not internal.get("notion_page_id"):
            raise RuntimeError(f"Verification failed; source ID missing for {row['title']}")
        photos = catalog.get("photos") or []
        if photos and row.get("cover_url") != photos[0]:
            raise RuntimeError(f"Verification failed; cover mismatch for {row['title']}")
    return rows


def record_summary(record: ParsedRecord, zf: zipfile.ZipFile) -> dict:
    resolved = [name for name in record.asset_names.values() if name]
    return {
        "title": record.title,
        "developer": record.row.get("developer"),
        "location": record.row.get("district"),
        "page_id": record.page_id,
        "assets": len(record.assets),
        "unresolved": len(record.assets) - len(resolved),
        "bytes": sum(zf.getinfo(name).file_size for name in resolved),
    }


def print_plan(missing: list[ParsedRecord], existing: list[dict], zf: zipfile.ZipFile) -> None:
    print(f"Current database rows: {len(existing)}")
    print(f"Missing source records: {len(missing)}")
    for record in missing:
        summary = record_summary(record, zf)
        print(
            f"- {summary['title']} | {summary['developer'] or '—'} | "
            f"{summary['location'] or '—'} | assets={summary['assets']} | "
            f"source={summary['bytes'] / 1024 / 1024:.1f} MB"
        )


def validate_missing(missing: list[ParsedRecord], zf: zipfile.ZipFile) -> None:
    problems: list[str] = []
    for record in missing:
        if not record.row.get("developer"):
            problems.append(f"{record.title}: developer is missing")
        for asset, zip_name in record.asset_names.items():
            if not zip_name:
                problems.append(f"{record.title}: unresolved {asset.target}")
                continue
            suffix = Path(unquote(zip_name)).suffix.casefold()
            if suffix not in IMAGE_SUFFIXES | DOCUMENT_SUFFIXES | CONVERTIBLE_SUFFIXES:
                problems.append(f"{record.title}: unsupported {zip_name}")
            if (
                suffix not in IMAGE_SUFFIXES | CONVERTIBLE_SUFFIXES
                and zf.getinfo(zip_name).file_size > MAX_STORAGE_BYTES
            ):
                problems.append(f"{record.title}: document exceeds 10 MB: {zip_name}")
    if problems:
        preview = "\n".join(f"- {problem}" for problem in problems[:30])
        raise RuntimeError(f"Import preflight failed ({len(problems)} problems):\n{preview}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip_path", type=Path, help="Notion export ZIP")
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--check-source", action="store_true", help="validate the ZIP without database access")
    modes.add_argument("--plan", action="store_true", help="compare the ZIP with Supabase without writing")
    modes.add_argument("--apply", action="store_true", help="insert missing rows and upload their media")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    zip_path = args.zip_path.expanduser().resolve()
    if not zip_path.is_file():
        raise SystemExit(f"ZIP not found: {zip_path}")
    repo_root = Path(__file__).resolve().parents[1]

    with zipfile.ZipFile(zip_path) as zf:
        bad_file = zf.testzip()
        if bad_file:
            raise RuntimeError(f"Corrupt ZIP entry: {bad_file}")
        records, _ = read_records(zf)
        profile = source_profile(records, zf)
        print(json.dumps(profile, ensure_ascii=False, indent=2))
        if profile["records"] != 131:
            raise RuntimeError(f"Expected 131 named source records, found {profile['records']}")
        if profile["unresolved_assets"]:
            raise RuntimeError("The source contains unresolved local asset references")
        if args.check_source:
            return

        client, user = authenticate(repo_root)
        existing = fetch_existing(client)
        missing, _ = find_missing(records, existing)
        print_plan(missing, existing, zf)
        validate_missing(missing, zf)
        if args.plan:
            return

        created_ids: list[str] = []
        uploaded = 0
        failures: list[tuple[str, str]] = []
        for index, record in enumerate(missing, 1):
            try:
                created, upload_count = insert_record(client, zf, record, user["id"])
                created_ids.append(created["id"])
                uploaded += upload_count
                print(
                    f"[{index}/{len(missing)}] added {record.title} "
                    f"({upload_count} uploaded assets)",
                    flush=True,
                )
            except Exception as error:
                failures.append((record.title, str(error)))
                print(f"[{index}/{len(missing)}] FAILED {record.title}: {error}", file=sys.stderr, flush=True)

        verified = verify_created(client, created_ids)
        final_rows = fetch_existing(client)
        still_missing, _ = find_missing(records, final_rows)
        print(
            json.dumps(
                {
                    "created": len(created_ids),
                    "verified": len(verified),
                    "uploaded_assets": uploaded,
                    "database_rows_after": len(final_rows),
                    "source_records_still_missing": [record.title for record in still_missing],
                    "failures": failures,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        if failures or still_missing:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
