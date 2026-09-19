"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DOCUMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.webp,.gif,.xls,.xlsx,application/pdf,image/jpeg,image/png,image/webp,image/gif,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function DocumentFilesField() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [names, setNames] = React.useState<string[]>([]);

  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor="document_files">Файлы планировок и шахматок</Label>
      <p className="text-sm text-muted-foreground">
        PDF, JPG, PNG, WEBP, GIF или Excel до 10 МБ. Можно выбрать несколько
        файлов.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => inputRef.current?.click()}>
          <Upload />
          Выбрать файлы
        </Button>
        <p className="min-w-0 text-sm text-muted-foreground">
          {names.length ? names.join(", ") : "Файлы не выбраны"}
        </p>
        <input
          ref={inputRef}
          id="document_files"
          name="document_files"
          type="file"
          multiple
          accept={DOCUMENT_ACCEPT}
          className="hidden"
          onChange={(event) => {
            setNames(
              Array.from(event.target.files ?? []).map((file) => file.name),
            );
          }}
        />
      </div>
    </div>
  );
}
