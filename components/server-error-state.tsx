import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServerErrorStateProps {
  title?: string;
  description?: string;
  onRetry: () => void;
}

export function ServerErrorState({
  title = "Не удалось загрузить данные",
  description = "Сервер или база данных сейчас не отвечают. Попробуйте повторить запрос.",
  onRetry,
}: ServerErrorStateProps) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-xl border bg-card p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button onClick={onRetry} className="mt-6">
          <RefreshCw className="h-4 w-4" />
          Повторить
        </Button>
      </div>
    </div>
  );
}
