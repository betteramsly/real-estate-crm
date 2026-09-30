#!/usr/bin/env python3
"""Migrate referenced Supabase JPEG/PNG/GIF assets to new WebP objects.

The migration never overwrites or deletes source objects. It uploads each WebP to
a content-addressed path, updates database references, and verifies that no legacy
raster references remain in the migrated records.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import sys
from pathlib import Path, PurePosixPath
from typing import Iterator
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageOps, ImageSequence


LEGACY_SUFFIXES = {".gif", ".jpeg", ".jpg", ".png"}
MAX_COMPLEX_BYTES = 10 * 1024 * 1024
MAX_AVATAR_BYTES = 3 * 1024 * 1024


def load_importer(repo_root: Path):
    path = repo_root / "scripts" / "import-notion-zhk.py"
    spec = importlib.util.spec_from_file_location("import_notion_zhk", path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def iter_strings(value: object) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from iter_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from iter_strings(item)


def replace_strings(value: object, replacements: dict[str, str]):
    if isinstance(value, str):
        return replacements.get(value, value)
    if isinstance(value, list):
        return [replace_strings(item, replacements) for item in value]
    if isinstance(value, dict):
        return {key: replace_strings(item, replacements) for key, item in value.items()}
    return value


def storage_object(url: str, base: str) -> tuple[str, str] | None:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != urlsplit(base).hostname:
        return None
    marker = "/storage/v1/object/public/"
    if marker not in parsed.path:
        return None
    bucket_and_path = unquote(parsed.path.split(marker, 1)[1])
    if "/" not in bucket_and_path:
        return None
    bucket, path = bucket_and_path.split("/", 1)
    if PurePosixPath(path).suffix.casefold() not in LEGACY_SUFFIXES:
        return None
    return bucket, path


def referenced_assets(rows: list[dict], base: str) -> dict[str, tuple[str, str]]:
    assets: dict[str, tuple[str, str]] = {}
    for row in rows:
        values = [row.get("cover_url"), row.get("catalog")]
        for value in values:
            for url in iter_strings(value):
                location = storage_object(url, base)
                if location and location[0] == "complexes":
                    assets[url] = location
    return assets


def avatar_assets(rows: list[dict], base: str) -> dict[str, tuple[str, str]]:
    assets: dict[str, tuple[str, str]] = {}
    for row in rows:
        url = row.get("avatar_url")
        if not isinstance(url, str):
            continue
        location = storage_object(url, base)
        if location and location[0] == "avatars":
            assets[url] = location
    return assets


def normalized_frame(frame: Image.Image, edge: int) -> Image.Image:
    image = ImageOps.exif_transpose(frame.copy())
    if "A" in image.getbands() or image.mode in {"LA", "P"}:
        image = image.convert("RGBA")
    else:
        image = image.convert("RGB")
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    return image


def convert_webp(content: bytes, max_bytes: int, max_edge: int = 3200) -> bytes:
    attempts = (
        (max_edge, 88),
        (max_edge, 84),
        (min(max_edge, 2800), 82),
        (min(max_edge, 2400), 80),
        (min(max_edge, 1920), 78),
    )
    for edge, quality in attempts:
        with Image.open(io.BytesIO(content)) as source:
            animated = bool(getattr(source, "is_animated", False) and source.n_frames > 1)
            output = io.BytesIO()
            if animated:
                frames = [normalized_frame(frame, edge) for frame in ImageSequence.Iterator(source)]
                durations = [
                    frame.info.get("duration", source.info.get("duration", 100))
                    for frame in ImageSequence.Iterator(source)
                ]
                frames[0].save(
                    output,
                    format="WEBP",
                    save_all=True,
                    append_images=frames[1:],
                    duration=durations,
                    loop=source.info.get("loop", 0),
                    quality=quality,
                    method=6,
                    minimize_size=True,
                )
            else:
                normalized_frame(source, edge).save(
                    output,
                    format="WEBP",
                    quality=quality,
                    method=6,
                )
            result = output.getvalue()
            if len(result) <= max_bytes:
                return result
    raise RuntimeError("WebP remains larger than the bucket limit")


def download(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "real-estate-crm-webp-migration/1"})
    with urlopen(request, timeout=90) as response:
        return response.read()


def upload(client, remote_error, bucket: str, path: str, content: bytes) -> bool:
    encoded = quote(path, safe="/")
    try:
        client.request(
            f"/storage/v1/object/{bucket}/{encoded}",
            "POST",
            content,
            {
                "Cache-Control": "31536000",
                "Content-Type": "image/webp",
                "x-upsert": "false",
            },
        )
        return True
    except remote_error as error:
        message = error.body.decode("utf-8", errors="replace").casefold()
        if error.code == 400 and ("duplicate" in message or "already exists" in message):
            return False
        raise


def migrated_path(
    path: str,
    content: bytes,
    bucket: str,
    authenticated_user_id: str,
) -> str:
    source = PurePosixPath(path)
    digest = hashlib.sha256(content).hexdigest()[:12]
    if bucket == "avatars" and source.parts[0] != authenticated_user_id:
        return f"{authenticated_user_id}/migrated/{source.stem}-webp-{digest}.webp"
    return str(source.with_name(f"{source.stem}-webp-{digest}.webp"))


def public_url(base: str, bucket: str, path: str) -> str:
    return f"{base.rstrip('/')}/storage/v1/object/public/{bucket}/{quote(path, safe='/')}"


def update_properties(client, rows: list[dict], replacements: dict[str, str]) -> int:
    updated = 0
    for row in rows:
        cover = replace_strings(row.get("cover_url"), replacements)
        catalog = replace_strings(row.get("catalog") or {}, replacements)
        if cover == row.get("cover_url") and catalog == (row.get("catalog") or {}):
            continue
        result = client.json(
            "/rest/v1/properties?" + urlencode({"id": f"eq.{row['id']}", "select": "id"}),
            "PATCH",
            {"cover_url": cover, "catalog": catalog},
            prefer="return=representation",
        )
        if not result:
            raise RuntimeError(f"Property update returned no row: {row['id']}")
        updated += 1
    return updated


def update_avatars(client, rows: list[dict], replacements: dict[str, str]) -> int:
    updated = 0
    for row in rows:
        previous = row.get("avatar_url")
        replacement = replacements.get(previous) if isinstance(previous, str) else None
        if not replacement:
            continue
        result = client.json(
            "/rest/v1/profiles?" + urlencode({"id": f"eq.{row['id']}", "select": "id"}),
            "PATCH",
            {"avatar_url": replacement},
            prefer="return=representation",
        )
        if not result:
            raise RuntimeError(f"Avatar profile update returned no row: {row['id']}")
        updated += 1
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Upload WebP files and patch references")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    importer = load_importer(repo_root)
    client, user = importer.authenticate(repo_root)
    properties = importer.fetch_existing(client)
    profiles = client.json(
        "/rest/v1/profiles?" + urlencode({"select": "id,avatar_url"})
    ) or []
    assets = referenced_assets(properties, client.base)
    avatars = avatar_assets(profiles, client.base)

    print(f"Properties: {len(properties)}")
    print(f"Legacy property images: {len(assets)}")
    print(f"Legacy avatars: {len(avatars)}")
    if not args.apply:
        print("Dry run only; rerun with --apply to migrate")
        return

    replacements: dict[str, str] = {}
    uploaded = 0
    source_bytes = 0
    webp_bytes = 0
    for url, (bucket, path) in {**assets, **avatars}.items():
        source = download(url)
        converted = convert_webp(
            source,
            MAX_AVATAR_BYTES if bucket == "avatars" else MAX_COMPLEX_BYTES,
            1600 if bucket == "avatars" else 3200,
        )
        target = migrated_path(path, converted, bucket, user["id"])
        if upload(client, importer.RemoteError, bucket, target, converted):
            uploaded += 1
        replacements[url] = public_url(client.base, bucket, target)
        source_bytes += len(source)
        webp_bytes += len(converted)

    updated_properties = update_properties(client, properties, replacements)
    updated_avatars = update_avatars(client, profiles, replacements)

    verified_properties = importer.fetch_existing(client)
    verified_profiles = client.json(
        "/rest/v1/profiles?" + urlencode({"select": "id,avatar_url"})
    ) or []
    remaining = referenced_assets(verified_properties, client.base)
    remaining_avatars = avatar_assets(verified_profiles, client.base)
    if remaining or remaining_avatars:
        raise RuntimeError(
            f"Verification failed: {len(remaining) + len(remaining_avatars)} legacy references remain"
        )

    ratio = (webp_bytes / source_bytes * 100) if source_bytes else 0
    print(f"Uploaded new WebP objects: {uploaded}")
    print(f"Updated properties: {updated_properties}")
    print(f"Updated avatars: {updated_avatars}")
    print(f"Bytes: {source_bytes} -> {webp_bytes} ({ratio:.1f}%)")
    print("Verification: no referenced Supabase JPEG/PNG/GIF assets remain")


if __name__ == "__main__":
    main()
