#!/usr/bin/env python3
"""Optimize referenced Supabase WebP images with the Tinify API.

The script is resumable and non-destructive: optimized images are written to new
content-addressed paths, database references are patched only after successful
uploads, and the original objects are retained for rollback.
"""

from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import importlib.util
import io
import math
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageChops


TINIFY_API = "https://api.tinify.com"
SUPPORTED_BUCKETS = {"avatars", "complexes"}
MAX_COMPLEX_BYTES = 10 * 1024 * 1024
MAX_AVATAR_BYTES = 3 * 1024 * 1024


@dataclass(frozen=True)
class Asset:
    url: str
    bucket: str
    path: str


@dataclass(frozen=True)
class OptimizationResult:
    asset: Asset
    status: str
    source_bytes: int
    output_bytes: int = 0
    psnr: float | None = None
    replacement: str | None = None
    compression_count: int | None = None
    detail: str | None = None


class TinifyError(RuntimeError):
    def __init__(self, code: int | None, message: str):
        super().__init__(message)
        self.code = code


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def basic_auth(api_key: str) -> str:
    token = base64.b64encode(f"api:{api_key}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def read_http_error(error: HTTPError) -> str:
    try:
        return error.read().decode("utf-8", errors="replace")[:600]
    except Exception:
        return str(error)


def tinify_compress(content: bytes, api_key: str) -> tuple[bytes, str, int | None]:
    headers = {
        "Authorization": basic_auth(api_key),
        "Content-Type": "application/octet-stream",
        "User-Agent": "real-estate-crm-tinify/1",
    }
    location: str | None = None
    compression_count: int | None = None

    for attempt in range(4):
        request = Request(
            f"{TINIFY_API}/shrink",
            data=content,
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=120) as response:
                location = response.headers.get("Location")
                raw_count = response.headers.get("Compression-Count")
                compression_count = int(raw_count) if raw_count and raw_count.isdigit() else None
                break
        except HTTPError as error:
            detail = read_http_error(error)
            if error.code in {429, 500, 502, 503, 504} and attempt < 3:
                time.sleep(2**attempt)
                continue
            raise TinifyError(error.code, detail) from error
        except URLError as error:
            if attempt < 3:
                time.sleep(2**attempt)
                continue
            raise TinifyError(None, str(error)) from error

    if not location:
        raise TinifyError(None, "Tinify did not return an output location")

    request = Request(
        location,
        headers={
            "Authorization": basic_auth(api_key),
            "User-Agent": "real-estate-crm-tinify/1",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=120) as response:
            return (
                response.read(),
                (response.headers.get("Content-Type") or "").split(";", 1)[0].lower(),
                compression_count,
            )
    except HTTPError as error:
        raise TinifyError(error.code, read_http_error(error)) from error
    except URLError as error:
        raise TinifyError(None, str(error)) from error


def image_details(content: bytes) -> tuple[tuple[int, int], int, bool]:
    with Image.open(io.BytesIO(content)) as image:
        frames = int(getattr(image, "n_frames", 1))
        return image.size, frames, bool(getattr(image, "is_animated", False) and frames > 1)


def image_psnr(source: bytes, optimized: bytes) -> float:
    with Image.open(io.BytesIO(source)) as original, Image.open(io.BytesIO(optimized)) as result:
        if original.size != result.size:
            raise ValueError("dimensions changed")
        alpha = "A" in original.getbands() or "A" in result.getbands()
        mode = "RGBA" if alpha else "RGB"
        left = original.convert(mode)
        right = result.convert(mode)
        difference = ImageChops.difference(left, right)
        histogram = difference.histogram()
        channel_size = 256
        squared_error = sum(
            ((index % channel_size) ** 2) * count
            for index, count in enumerate(histogram)
        )
        samples = original.width * original.height * len(left.getbands())
        if not squared_error:
            return math.inf
        mse = squared_error / samples
        return 20 * math.log10(255 / math.sqrt(mse))


def storage_asset(url: str, base: str) -> Asset | None:
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
    if bucket not in SUPPORTED_BUCKETS or PurePosixPath(path).suffix.casefold() != ".webp":
        return None
    if "-tinify-" in PurePosixPath(path).stem:
        return None
    return Asset(url=url, bucket=bucket, path=path)


def collect_assets(properties: list[dict], profiles: list[dict], base: str, common) -> list[Asset]:
    assets: dict[str, Asset] = {}
    for row in properties:
        for value in (row.get("cover_url"), row.get("catalog")):
            for url in common.iter_strings(value):
                asset = storage_asset(url, base)
                if asset and asset.bucket == "complexes":
                    assets[url] = asset
    for row in profiles:
        url = row.get("avatar_url")
        if isinstance(url, str):
            asset = storage_asset(url, base)
            if asset and asset.bucket == "avatars":
                assets[url] = asset
    return sorted(assets.values(), key=lambda item: item.url)


def download(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "real-estate-crm-tinify/1"})
    with urlopen(request, timeout=120) as response:
        return response.read()


def target_path(asset: Asset, content: bytes, authenticated_user_id: str) -> str:
    source = PurePosixPath(asset.path)
    digest = hashlib.sha256(content).hexdigest()[:12]
    name = f"{source.stem}-tinify-{digest}.webp"
    if asset.bucket == "avatars" and source.parts[0] != authenticated_user_id:
        return f"{authenticated_user_id}/tinify/{name}"
    return str(source.with_name(name))


def upload(client, remote_error, asset: Asset, path: str, content: bytes) -> None:
    try:
        client.request(
            f"/storage/v1/object/{asset.bucket}/{quote(path, safe='/')}",
            "POST",
            content,
            {
                "Cache-Control": "31536000",
                "Content-Type": "image/webp",
                "x-upsert": "false",
            },
        )
    except remote_error as error:
        detail = error.body.decode("utf-8", errors="replace").casefold()
        if error.code == 400 and ("duplicate" in detail or "already exists" in detail):
            return
        raise


def optimize_asset(
    asset: Asset,
    *,
    api_key: str,
    authenticated_user_id: str,
    base: str,
    client,
    remote_error,
    minimum_psnr: float,
    minimum_savings: float,
) -> OptimizationResult:
    try:
        source = download(asset.url)
        source_size, source_frames, animated = image_details(source)
        if animated:
            return OptimizationResult(
                asset=asset,
                status="animated",
                source_bytes=len(source),
                detail=f"{source_frames} frames",
            )

        optimized, content_type, compression_count = tinify_compress(source, api_key)
        if content_type != "image/webp":
            return OptimizationResult(
                asset=asset,
                status="invalid-output",
                source_bytes=len(source),
                output_bytes=len(optimized),
                compression_count=compression_count,
                detail=f"content-type={content_type or 'missing'}",
            )

        output_size, output_frames, output_animated = image_details(optimized)
        if output_size != source_size or output_frames != source_frames or output_animated:
            return OptimizationResult(
                asset=asset,
                status="dimensions-changed",
                source_bytes=len(source),
                output_bytes=len(optimized),
                compression_count=compression_count,
                detail=f"{source_size} -> {output_size}",
            )

        psnr = image_psnr(source, optimized)
        savings = 100 * (len(source) - len(optimized)) / len(source)
        if len(optimized) >= len(source) or savings < minimum_savings:
            return OptimizationResult(
                asset=asset,
                status="not-smaller",
                source_bytes=len(source),
                output_bytes=len(optimized),
                psnr=psnr,
                compression_count=compression_count,
                detail=f"savings={savings:.1f}%",
            )
        if psnr < minimum_psnr:
            return OptimizationResult(
                asset=asset,
                status="quality-rejected",
                source_bytes=len(source),
                output_bytes=len(optimized),
                psnr=psnr,
                compression_count=compression_count,
                detail=f"PSNR={psnr:.1f} dB",
            )

        max_bytes = MAX_AVATAR_BYTES if asset.bucket == "avatars" else MAX_COMPLEX_BYTES
        if len(optimized) > max_bytes:
            return OptimizationResult(
                asset=asset,
                status="too-large",
                source_bytes=len(source),
                output_bytes=len(optimized),
                psnr=psnr,
                compression_count=compression_count,
            )

        path = target_path(asset, optimized, authenticated_user_id)
        upload(client, remote_error, asset, path, optimized)
        replacement = f"{base.rstrip('/')}/storage/v1/object/public/{asset.bucket}/{quote(path, safe='/')}"
        return OptimizationResult(
            asset=asset,
            status="optimized",
            source_bytes=len(source),
            output_bytes=len(optimized),
            psnr=psnr,
            replacement=replacement,
            compression_count=compression_count,
            detail=f"savings={savings:.1f}%",
        )
    except TinifyError:
        raise
    except Exception as error:
        return OptimizationResult(
            asset=asset,
            status="error",
            source_bytes=0,
            detail=str(error)[:300],
        )


def patch_database(client, properties: list[dict], profiles: list[dict], replacements: dict[str, str], common):
    updated_properties = common.update_properties(client, properties, replacements)
    updated_avatars = common.update_avatars(client, profiles, replacements)
    return updated_properties, updated_avatars


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Call Tinify, upload accepted results and patch references")
    parser.add_argument("--limit", type=int, help="Process only the first N assets (useful for a pilot)")
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 9))
    parser.add_argument("--minimum-psnr", type=float, default=35.0)
    parser.add_argument("--minimum-savings", type=float, default=5.0)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    common = load_module(
        "migrate_images_to_webp",
        repo_root / "scripts" / "migrate-images-to-webp.py",
    )
    importer = common.load_importer(repo_root)
    client, user = importer.authenticate(repo_root)
    properties = importer.fetch_existing(client)
    profiles = client.json(
        "/rest/v1/profiles?" + urlencode({"select": "id,avatar_url"})
    ) or []
    assets = collect_assets(properties, profiles, client.base, common)
    selected = assets[: args.limit] if args.limit is not None else assets

    already_optimized = 0
    for row in [*properties, *profiles]:
        for url in common.iter_strings(row):
            parsed = urlsplit(url)
            if parsed.hostname == urlsplit(client.base).hostname and "-tinify-" in parsed.path:
                already_optimized += 1

    print(f"Properties: {len(properties)}", flush=True)
    print(f"WebP assets pending Tinify: {len(assets)}", flush=True)
    print(f"Selected this run: {len(selected)}", flush=True)
    print(f"Tinify references already present: {already_optimized}", flush=True)
    if not args.apply:
        print("Dry run only; rerun with --apply", flush=True)
        return
    if not selected:
        print("Nothing to optimize", flush=True)
        return

    api_key = os.environ.get("TINIFY_API_KEY", "").strip() or getpass.getpass("Tinify API key: ").strip()
    if not api_key:
        raise RuntimeError("Tinify API key is required")

    replacements: dict[str, str] = {}
    results: list[OptimizationResult] = []
    lock = Lock()
    fatal: TinifyError | None = None

    def run(asset: Asset) -> OptimizationResult:
        return optimize_asset(
            asset,
            api_key=api_key,
            authenticated_user_id=user["id"],
            base=client.base,
            client=client,
            remote_error=importer.RemoteError,
            minimum_psnr=args.minimum_psnr,
            minimum_savings=args.minimum_savings,
        )

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(run, asset): asset for asset in selected}
        for index, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
            except TinifyError as error:
                fatal = error
                for pending in futures:
                    pending.cancel()
                break
            with lock:
                results.append(result)
                if result.replacement:
                    replacements[result.asset.url] = result.replacement
                optimized_count = sum(item.status == "optimized" for item in results)
                kept_count = len(results) - optimized_count
                count = result.compression_count
                suffix = f" | account count={count}" if count is not None else ""
                print(
                    f"[{index}/{len(selected)}] optimized={optimized_count} kept={kept_count} "
                    f"last={result.status}{suffix}",
                    flush=True,
                )

    if fatal:
        raise RuntimeError(f"Tinify failed ({fatal.code or 'network'}): {fatal}") from fatal

    updated_properties, updated_avatars = patch_database(
        client,
        properties,
        profiles,
        replacements,
        common,
    )

    optimized_results = [result for result in results if result.status == "optimized"]
    source_bytes = sum(result.source_bytes for result in optimized_results)
    output_bytes = sum(result.output_bytes for result in optimized_results)
    statuses: dict[str, int] = {}
    for result in results:
        statuses[result.status] = statuses.get(result.status, 0) + 1

    verified_properties = importer.fetch_existing(client)
    verified_profiles = client.json(
        "/rest/v1/profiles?" + urlencode({"select": "id,avatar_url"})
    ) or []
    referenced = set(common.iter_strings([*verified_properties, *verified_profiles]))
    missing_replacements = [url for url in replacements.values() if url not in referenced]
    if missing_replacements:
        raise RuntimeError(f"Verification failed: {len(missing_replacements)} optimized URLs are not referenced")

    savings = 100 * (source_bytes - output_bytes) / source_bytes if source_bytes else 0
    print(f"Statuses: {dict(sorted(statuses.items()))}", flush=True)
    print(f"Updated properties: {updated_properties}", flush=True)
    print(f"Updated avatars: {updated_avatars}", flush=True)
    print(f"Accepted bytes: {source_bytes} -> {output_bytes} ({savings:.1f}% smaller)", flush=True)
    print("Verification: every accepted Tinify URL is referenced in the database", flush=True)


if __name__ == "__main__":
    main()
