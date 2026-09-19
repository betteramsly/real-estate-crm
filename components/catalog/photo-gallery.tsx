"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, Images, X } from "lucide-react";
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

function nearbyIndexes(index: number, count: number, radius = 2) {
  if (count <= 0) return [];
  const indexes = new Set<number>();
  for (let offset = -radius; offset <= radius; offset += 1) {
    const next = index + offset;
    if (next >= 0 && next < count) indexes.add(next);
  }
  return Array.from(indexes);
}

function usePhotoPreload(photos: string[], index: number) {
  const photosKey = photos.join("|");
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const loaded = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
  const inflight = useRef(0);

  const pump = useCallback(() => {
    while (inflight.current < 3) {
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
      image.src = url;
    }
  }, []);

  const enqueue = useCallback(
    (urls: string[], front = false) => {
      const fresh = urls.filter((url) => url && !loaded.current.has(url));
      if (!fresh.length) return;
      queue.current = front
        ? [...fresh, ...queue.current.filter((url) => !fresh.includes(url))]
        : [...queue.current, ...fresh.filter((url) => !queue.current.includes(url))];
      pump();
    },
    [pump],
  );

  useEffect(() => {
    loaded.current = new Set();
    queue.current = [];
    inflight.current = 0;
    const list = photosRef.current;
    enqueue(
      nearbyIndexes(0, list.length).map((photoIndex) => list[photoIndex] ?? ""),
      true,
    );
    const start = window.setTimeout(() => {
      enqueue(list.slice(1));
    }, 200);
    return () => window.clearTimeout(start);
  }, [enqueue, photosKey]);

  useEffect(() => {
    const list = photosRef.current;
    enqueue(
      nearbyIndexes(index, list.length).map((photoIndex) => list[photoIndex] ?? ""),
      true,
    );
  }, [enqueue, index, photosKey]);
}

function ThumbImage({
  url,
  eager,
}: {
  url: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded ? (
        <span className="absolute inset-0 animate-pulse bg-muted" />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-150",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function SlideImage({
  photos,
  index,
  alt,
  className,
  priority,
}: {
  photos: string[];
  index: number;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const photosKey = photos.join("|");
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const [ready, setReady] = useState<Set<string>>(() => new Set());
  const [mounted, setMounted] = useState<Set<number>>(
    () => new Set(nearbyIndexes(index, photos.length)),
  );
  const lastReady = useRef(photos[index]);
  usePhotoPreload(photos, index);

  useEffect(() => {
    const list = photosRef.current;
    setMounted((current) => {
      const next = new Set(current);
      next.add(index);
      for (const photoIndex of nearbyIndexes(index, list.length)) {
        next.add(photoIndex);
      }
      return next;
    });
  }, [index, photosKey]);

  const activeUrl = photos[index];
  const activeReady = Boolean(activeUrl && ready.has(activeUrl));
  if (activeReady && activeUrl) lastReady.current = activeUrl;

  const markReady = (url: string) => {
    setReady((current) => {
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
    <div className="pointer-events-none absolute inset-0 z-0">
      {urls.map((url) => {
        const active = url === activeUrl;
        const fallback = !activeReady && url === lastReady.current;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            ref={bindReady(url)}
            src={url}
            alt={active ? alt : ""}
            decoding="async"
            fetchPriority={priority && active ? "high" : "low"}
            onLoad={() => markReady(url)}
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
  const startX = useRef<number | null>(null);

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

  return { open, index, setIndex, setOpen, go, openAt, startX };
}

function PhotoLightbox({
  photos,
  alt,
  index,
  onClose,
  onIndex,
  onDelta,
  startX,
}: {
  photos: string[];
  alt: string;
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
  onDelta: (delta: number) => void;
  startX: React.MutableRefObject<number | null>;
}) {
  const current = photos[index];
  if (!current || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={(event) => {
        startX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (startX.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - startX.current;
        if (delta > 48) onDelta(-1);
        if (delta < -48) onDelta(1);
        startX.current = null;
      }}
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

      <div
        className="relative min-h-0 flex-1"
        onClick={(event) => {
          if (photos.length < 2) return;
          const mid =
            event.currentTarget.getBoundingClientRect().left +
            event.currentTarget.getBoundingClientRect().width / 2;
          onDelta(event.clientX < mid ? -1 : 1);
        }}
      >
        <SlideImage
          photos={photos}
          index={index}
          alt={alt}
          className="object-contain"
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelta(-1);
              }}
              className="absolute left-3 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Предыдущее фото"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelta(1);
              }}
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
            <button
              key={`${url}-${photoIndex}`}
              type="button"
              onClick={() => onIndex(photoIndex)}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2",
                photoIndex === index
                  ? "border-white"
                  : "border-transparent opacity-70",
              )}
            >
              <ThumbImage url={url} eager={photoIndex < 8} />
            </button>
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
  const startX = useRef<number | null>(null);
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
      startX={startX}
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
  const { open, index, setIndex, setOpen, go, openAt, startX } = usePhotoLightbox(
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
              "overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_8px_30px_rgba(0,0,0,0.18)]",
              size === "map" && "w-full",
            )}
            aria-label={`Открыть фото ${photoIndex + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${alt} ${photoIndex + 1}`}
              loading="lazy"
              decoding="async"
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
          startX={startX}
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
  const startX = useRef<number | null>(null);

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
              <button
                key={url}
                type="button"
                onClick={() => setIndex(photoIndex)}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border bg-muted",
                  photoIndex === index
                    ? "border-primary"
                    : "border-transparent hover:border-foreground/20",
                )}
                aria-label={`Показать фото ${photoIndex + 1}`}
              >
                <ThumbImage
                  url={url}
                  eager={photoIndex < 8 || Math.abs(photoIndex - index) <= 2}
                />
              </button>
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
          startX={startX}
        />
      ) : null}
    </>
  );
}
