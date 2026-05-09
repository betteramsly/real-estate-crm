"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const messages: Record<string, string> = {
  client: "Клиент создан",
  deal: "Сделка создана",
  property: "Объект создан",
  task: "Задача создана",
};

export function CreatedToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shownRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const created = searchParams.get("created");
    if (!created) return;
    const key = `${pathname}?created=${created}`;
    if (shownRef.current === key) return;
    shownRef.current = key;

    const message = messages[created] ?? "Запись создана";
    toast.success(message);

    const next = new URLSearchParams(searchParams);
    next.delete("created");
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [pathname, searchParams, router]);

  return null;
}
