"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Images, Loader2, RotateCw, X } from "lucide-react";
import {
  catalogPhotoSrc,
  canOptimizeCatalogPhoto,
  photoPreloadConcurrency,
  photoPreloadRadius,
  readPhotoConnection,
  type CatalogPhotoWidth,
} from "@/lib/catalog-photo";
import { cn } from "@/lib/utils";

function photoFileName(url: string, alt: string, index: number) {
  try {
    const path = new URL(url, "https://local.invalid").pathname;
    const raw = decodeURIComponent(path.split("/").pop() || "");
    if (raw && /\.[a-z0-9]{2,5}$/i.test(raw)) return raw;
  } catch {
    // ignore
  }
  const slug =
    alt.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "foto";
  return `${slug}-${index + 1}.jpg`;
}

function photoDownloadHref(url: string, alt: string, index: number) {
  const name = photoFileName(url, alt, index);
  return `/api/photo-download?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
}

function nearbyIndexes(index: number, count: number, radius = 1) {
  if (count <= 0) return [];
  const indexes = new Set<number>();
  for (let offset = -radius; offset <= radius; offset += 1) {
    const next = index + offset;
    if (next >= 0 && next < count) indexes.add(next);
  }
  return Array.from(indexes);
}

function usePhotoPreload(
  photos: string[],
  index: number,
  width: CatalogPhotoWidth,
) {
  const photosKey = photos.join("|");
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const loaded = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
  const inflight = useRef(0);

  const pump = useCallback(() => {
    const limit = photoPreloadConcurrency(readPhotoConnection());
    while (inflight.current < limit) {
      const url = queue.current.shift();
      if (!url) return;
      if (loaded.current.has(url)) continue;
      loaded.current.add(url);
      inflight.current += 1;
      const image = new window.Image();
      image.decoding = "async";
      const done = () => {
        inflight.current -= 1;
        pump();
      };
      image.onload = done;
      image.onerror = done;
      image.src = catalogPhotoSrc(url, width);
    }
  }, [width]);

  const enqueue = useCallback(
    (urls: string[]) => {
      const fresh = urls.filter((url) => url && !loaded.current.has(url));
      if (!fresh.length) return;
      queue.current = [
        ...fresh,
        ...queue.current.filter((url) => !fresh.includes(url)),
      ];
      pump();
    },
    [pump],
  );

  useEffect(() => {
    loaded.current = new Set();
    queue.current = [];
    inflight.current = 0;
  }, [photosKey]);

  useEffect(() => {
    const list = photosRef.current;
    const radius = photoPreloadRadius(readPhotoConnection());
    enqueue(
      nearbyIndexes(index, list.length, radius).map(
        (photoIndex) => list[photoIndex] ?? "",
      ),
    );
  }, [enqueue, index, photosKey]);
}

function PhotoStatus({
  status,
  label,
  onRetry,
}: {
  status: "loading" | "ready" | "error";
  label?: string;
  onRetry?: () => void;
}) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), 700);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "ready") return null;

  if (status === "error") {
    return (
      <span className="absolute inset-0 z-[2] flex items-center justify-center bg-muted/80 p-3">
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onRetry?.();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onRetry?.();
          }}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Повторить
        </span>
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-center justify-center gap-2 bg-muted">
      <span className="absolute inset-0 animate-pulse bg-muted" />
      <span className="relative z-[1] inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {slow ? (label ?? "Загружаем фото…") : null}
      </span>
    </span>
  );
}

function CatalogPhoto({
  url,
  alt,
  className,
  width,
  loading = "lazy",
  fetchPriority,
  onReady,
}: {
  url: string;
  alt: string;
  className?: string;
  width: CatalogPhotoWidth;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  onReady?: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const imgRef = useRef<HTMLImageElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const src = catalogPhotoSrc(url, width);
  const external = !canOptimizeCatalogPhoto(url);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setStatus("ready");
      onReadyRef.current?.();
      return;
    }
    if (img?.complete) {
      setStatus("error");
      return;
    }
    setStatus("loading");
  }, [src, attempt]);

  return (
    <>
      <PhotoStatus
        status={status}
        onRetry={() => setAttempt((value) => value + 1)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${src}-${attempt}`}
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        referrerPolicy={external ? "no-referrer" : undefined}
        fetchPriority={fetchPriority}
        onLoad={() => {
          setStatus("ready");
          onReadyRef.current?.();
        }}
        onError={() => setStatus("error")}
        className={cn(
          className,
          status === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function ThumbImage({
  url,
  eager,
}: {
  url: string;
  eager?: boolean;
}) {
  return (
    <CatalogPhoto
      url={url}
      alt=""
      width={256}
      loading={eager ? "eager" : "lazy"}
      className="h-full w-full object-cover transition-opacity duration-150"
    />
  );
}

function ThumbButton({
  url,
  index,
  current,
  count,
  label,
  className,
  activeClass,
  idleClass,
  onSelect,
}: {
  url: string;
  index: number;
  current: number;
  count: number;
  label: string;
  className?: string;
  activeClass: string;
  idleClass: string;
  onSelect: () => void;
}) {
  const near = Math.abs(index - current) <= 1;
  const eager = near || index < 4;
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(eager);

  useEffect(() => {
    if (near) setVisible(true);
  }, [near]);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    const root = node?.parentElement;
    if (!node || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { root, rootMargin: "96px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, count]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        className,
        index === current ? activeClass : idleClass,
      )}
      aria-label={label}
    >
      {visible ? <ThumbImage url={url} eager={eager} /> : null}
    </button>
  );
}

function SlideImage({
  photos,
  index,
  alt,
  className,
  priority,
  width,
}: {
  photos: string[];
  index: number;
  alt: string;
  className?: string;
  priority?: boolean;
  width: CatalogPhotoWidth;
}) {
  const photosKey = photos.join("|");
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [attempt, setAttempt] = useState(0);
  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set(nearbyIndexes(index, photos.length, 1)),
  );
  const lastReady = useRef(photos[index]);
  usePhotoPreload(photos, index, width);

  useEffect(() => {
    const list = photosRef.current;
    const radius = photoPreloadRadius(readPhotoConnection());
    setMounted((current) => {
      const next = new Set(current);
      next.add(index);
      for (const photoIndex of nearbyIndexes(index, list.length, radius)) {
        next.add(photoIndex);
      }
      return next;
    });
  }, [index, photosKey]);

  const activeUrl = photos[index];
  const activeReady = Boolean(activeUrl && ready.has(activeUrl));
  const activeFailed = Boolean(activeUrl && failed.has(activeUrl));
  if (activeReady && activeUrl) lastReady.current = activeUrl;

  const markReady = (url: string) => {
    setFailed((current) => {
      if (!current.has(url)) return current;
      const next = new Set(current);
      next.delete(url);
      return next;
    });
    setReady((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };

  const markFailed = (url: string) => {
    setFailed((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };

  const bindReady = (url: string) => (node: HTMLImageElement | null) => {
    if (!node) return;
    if (node.complete && node.naturalWidth > 0) markReady(url);
  };

  const urls = Array.from(
    new Set(
      [...mounted]
        .map((photoIndex) => photos[photoIndex])
        .filter((url): url is string => Boolean(url)),
    ),
  );

  return (
    <div className="absolute inset-0 z-0">
      <PhotoStatus
        status={activeFailed ? "error" : activeReady ? "ready" : "loading"}
        onRetry={() => {
          if (!activeUrl) return;
          setFailed((current) => {
            const next = new Set(current);
            next.delete(activeUrl);
            return next;
          });
          setReady((current) => {
            const next = new Set(current);
            next.delete(activeUrl);
            return next;
          });
          setAttempt((value) => value + 1);
        }}
      />
      {urls.map((url) => {
        const active = url === activeUrl;
        const fallback = !activeReady && !activeFailed && url === lastReady.current;
        const src = catalogPhotoSrc(url, width);
        const external = !canOptimizeCatalogPhoto(url);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${url === activeUrl ? attempt : 0}`}
            ref={bindReady(url)}
            src={src}
            alt={active ? alt : ""}
            decoding="async"
            referrerPolicy={external ? "no-referrer" : undefined}
            fetchPriority={priority && active ? "high" : "low"}
            onLoad={() => markReady(url)}
            onError={() => markFailed(url)}
            className={cn(
              "absolute inset-0 h-full w-full transition-opacity duration-150",
              className,
              active || fallback ? "opacity-100" : "opacity-0",
              active ? "z-[1]" : "z-0",
            )}
          />
        );
      })}
    </div>
  );
}

function usePhotoLightbox(count: number) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (delta: number) => {
      if (!count) return;
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  const openAt = (next: number) => {
    setIndex(next);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, open]);

  return { open, index, setIndex, setOpen, go, openAt };
}

function PhotoLightbox({
  photos,
  alt,
  index,
  onClose,
  onIndex,
  onDelta,
}: {
  photos: string[];
  alt: string;
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
  onDelta: (delta: number) => void;
}) {
  const current = photos[index];
  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="truncate text-sm font-medium">{alt}</p>
        <div className="flex items-center gap-2">
          {photos.length > 1 ? (
            <span className="text-sm text-white/70">
              {index + 1} / {photos.length}
            </span>
          ) : null}
          <a
            href={photoDownloadHref(current, alt, index)}
            download={photoFileName(current, alt, index)}
            onClick={(event) => event.stopPropagation()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Скачать фото"
          >
            <Download className="h-5 w-5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <SlideImage
          photos={photos}
          index={index}
          alt={alt}
          className="object-contain"
          width={1920}
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => onDelta(-1)}
              className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => onDelta(1)}
              className="absolute right-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Следующее фото"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {photos.map((url, photoIndex) => (
            <ThumbButton
              key={`${url}-${photoIndex}`}
              url={url}
              index={photoIndex}
              current={index}
              count={photos.length}
              label={`Показать фото ${photoIndex + 1}`}
              className="h-14 w-20 rounded-lg border-2"
              activeClass="border-white bg-white/10"
              idleClass="border-transparent bg-white/10 opacity-70"
              onSelect={() => onIndex(photoIndex)}
            />
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

export function PhotoViewer({
  photos,
  alt,
  index,
  onClose,
}: {
  photos: string[];
  alt: string;
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);
  const go = useCallback(
    (delta: number) => {
      if (!photos.length) return;
      setCurrent((value) => (value + delta + photos.length) % photos.length);
    },
    [photos.length],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  return (
    <PhotoLightbox
      photos={photos}
      alt={alt}
      index={current}
      onClose={onClose}
      onIndex={setCurrent}
      onDelta={go}
    />
  );
}

export function LightboxPhotos({
  photos,
  alt,
  size = "default",
}: {
  photos: string[];
  alt: string;
  size?: "default" | "map" | "price";
}) {
  const { open, index, setIndex, setOpen, go, openAt } = usePhotoLightbox(
    photos.length,
  );

  if (!photos.length) return null;

  const imageClass =
    size === "map"
      ? "block h-auto w-full max-h-[min(22rem,55vh)] object-contain"
      : size === "price"
        ? "block max-h-[min(32rem,75vh)] w-auto max-w-full object-contain"
        : "block max-h-80 w-auto max-w-full object-contain";

  return (
    <>
      <div
        className={cn(
          "grid gap-4",
          size === "map" ? "justify-items-stretch" : "justify-items-center",
          photos.length > 1 && size !== "map" && "sm:grid-cols-2",
        )}
      >
        {photos.map((url, photoIndex) => (
          <button
            key={`${url}-${photoIndex}`}
            type="button"
            onClick={() => openAt(photoIndex)}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/70 bg-muted shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
              size === "map" && "min-h-40 w-full",
              size === "price" && "min-h-52 w-full max-w-md",
              size === "default" && "min-h-40",
            )}
            aria-label={`Открыть фото ${photoIndex + 1}`}
          >
            <CatalogPhoto
              url={url}
              alt={`${alt} ${photoIndex + 1}`}
              width={size === "price" ? 1080 : 1200}
              loading={photoIndex === 0 ? "eager" : "lazy"}
              className={imageClass}
            />
          </button>
        ))}
      </div>
      {open ? (
        <PhotoLightbox
          photos={photos}
          alt={alt}
          index={index}
          onClose={() => setOpen(false)}
          onIndex={setIndex}
          onDelta={go}
        />
      ) : null}
    </>
  );
}

export function PricePhotos({
  photos,
  alt,
  size = "price",
}: {
  photos: string[];
  alt: string;
  size?: "default" | "map" | "price";
}) {
  return <LightboxPhotos photos={photos} alt={alt} size={size} />;
}

export function PhotoGallery({
  photos,
  alt,
  children,
  className,
}: {
  photos: string[];
  alt: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const count = photos.length;
  const current = photos[index] ?? photos[0];

  const go = useCallback(
    (delta: number) => {
      if (!count) return;
      setIndex((current) => (current + delta + count) % count);
    },
    [count],
  );

  const openAt = (next: number) => {
    setIndex(next);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, open]);

  return (
    <>
      <div className={cn("overflow-hidden", className)}>
        <button
          type="button"
          onClick={() => openAt(index)}
          disabled={!current}
          className="relative block aspect-[16/10] w-full bg-muted md:aspect-[16/9]"
          aria-label={
            count > 1
              ? `Открыть фото, ${index + 1} из ${count}`
              : "Открыть фото"
          }
        >
          {current ? (
            <SlideImage
              photos={photos}
              index={index}
              alt={alt}
              className="object-cover"
              priority
              width={1080}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--muted-foreground)/0.14),_transparent_50%)]" />
          )}
          {count > 1 ? (
            <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              <Images className="h-3.5 w-3.5" />
              {count} фото
            </span>
          ) : null}
          {children ? (
            <div className="pointer-events-none absolute inset-0 z-10">
              {children}
            </div>
          ) : null}
        </button>

        {count > 1 ? (
          <div className="flex gap-2 overflow-x-auto p-3">
            {photos.map((url, photoIndex) => (
              <ThumbButton
                key={url}
                url={url}
                index={photoIndex}
                current={index}
                count={photos.length}
                label={`Показать фото ${photoIndex + 1}`}
                className="h-16 w-24 rounded-xl border"
                activeClass="border-primary"
                idleClass="border-transparent hover:border-foreground/20"
                onSelect={() => setIndex(photoIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>

      {open ? (
        <PhotoLightbox
          photos={photos}
          alt={alt}
          index={index}
          onClose={() => setOpen(false)}
          onIndex={setIndex}
          onDelta={go}
        />
      ) : null}
    </>
  );
}
