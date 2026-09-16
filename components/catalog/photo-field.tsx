"use client";

import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, GripVertical, Trash2, Upload } from "lucide-react";
import { PhotoViewer } from "@/components/catalog/photo-gallery";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fileOrderToken } from "@/lib/photo-order";
import { cn } from "@/lib/utils";

type PhotoItem = {
  id: string;
  src: string;
  file?: File;
};

function toOrderValue(items: PhotoItem[]) {
  let fileIndex = 0;
  return items.map((item) =>
    item.file ? fileOrderToken(fileIndex++) : item.src,
  );
}

export function PhotoField({
  name,
  filesName,
  urls,
  label,
  hint,
  markCover = false,
}: {
  name: string;
  filesName: string;
  urls: string[];
  label: string;
  hint?: string;
  markCover?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<PhotoItem[]>(() =>
    urls.map((src, index) => ({ id: `kept-${index}-${src}`, src })),
  );
  const [preview, setPreview] = React.useState<number | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const allPhotos = React.useMemo(() => items.map((item) => item.src), [items]);
  const activeItem = items.find((item) => item.id === activeId) ?? null;

  React.useEffect(() => {
    return () => {
      items.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.src);
      });
    };
    // Revoke blob urls only when the field unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncFiles = (next: PhotoItem[]) => {
    const transfer = new DataTransfer();
    next.forEach((item) => {
      if (item.file) transfer.items.add(item.file);
    });
    if (inputRef.current) inputRef.current.files = transfer.files;
  };

  const removeItem = (id: string) => {
    setItems((current) => {
      const next = current.filter((item) => item.id !== id);
      current
        .filter((item) => item.id === id && item.file)
        .forEach((item) => URL.revokeObjectURL(item.src));
      syncFiles(next);
      return next;
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((item) => item.id === active.id);
      const newIndex = current.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <input type="hidden" name={name} value={JSON.stringify(toOrderValue(items))} />
      {items.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {items.map((item, index) => (
                <SortablePhotoTile
                  key={item.id}
                  id={item.id}
                  src={item.src}
                  cover={markCover && index === 0}
                  onView={() => setPreview(index)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeItem ? (
              <PhotoTile src={activeItem.src} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center hover:bg-accent">
        <Upload className="h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium">Загрузить фото с компьютера</span>
        <span className="text-xs text-muted-foreground">
          JPG, PNG или WEBP. Можно выбрать сразу несколько файлов.
        </span>
        <input
          ref={inputRef}
          type="file"
          name={filesName}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (!files.length) return;
            const added = files.map((file, index) => ({
              id: `file-${file.name}-${file.size}-${index}-${Date.now()}`,
              src: URL.createObjectURL(file),
              file,
            }));
            setItems((current) => {
              const next = [...current, ...added];
              syncFiles(next);
              return next;
            });
          }}
        />
      </label>
      {preview != null && allPhotos[preview] ? (
        <PhotoViewer
          photos={allPhotos}
          alt={label}
          index={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </div>
  );
}

function SortablePhotoTile({
  id,
  src,
  cover,
  onView,
  onRemove,
}: {
  id: string;
  src: string;
  cover?: boolean;
  onView: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("select-none", isDragging && "z-10 opacity-40")}
      aria-label="Переместить фото"
      {...attributes}
      {...listeners}
    >
      <PhotoTile src={src} cover={cover} onView={onView} onRemove={onRemove} />
    </div>
  );
}

function PhotoTile({
  src,
  cover,
  overlay,
  onView,
  onRemove,
}: {
  src: string;
  cover?: boolean;
  overlay?: boolean;
  onView?: () => void;
  onRemove?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/3] overflow-hidden rounded-2xl border bg-muted",
        overlay ? "scale-[1.03] shadow-lg" : "cursor-grab active:cursor-grabbing",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="pointer-events-none h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute left-1.5 top-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      {cover ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-russian px-2 py-0.5 text-[10px] font-medium text-gold">
          Обложка
        </span>
      ) : null}
      {onView && onRemove ? (
        <div className="absolute right-1.5 top-1.5 flex gap-1">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={onView}
            aria-label="Посмотреть фото"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            onClick={onRemove}
            aria-label="Удалить фото"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
