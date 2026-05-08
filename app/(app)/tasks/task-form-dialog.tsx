"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import {
  createTaskAction,
  type TaskFormState,
} from "@/lib/actions/tasks";
import type { Client, Deal, Profile, Property } from "@/lib/types";

interface TaskFormDialogProps {
  trigger: React.ReactNode;
  clients: Pick<Client, "id" | "full_name">[];
  deals: Pick<Deal, "id" | "title">[];
  properties: Pick<Property, "id" | "title">[];
  profiles: Profile[];
  defaultClientId?: string;
  defaultDealId?: string;
  defaultPropertyId?: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Создать
    </Button>
  );
}

export function TaskFormDialog({
  trigger,
  clients,
  deals,
  properties,
  profiles,
  defaultClientId,
  defaultDealId,
  defaultPropertyId,
}: TaskFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useFormState<TaskFormState, FormData>(
    createTaskAction,
    {},
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Заголовок <RequiredMark />
            </Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select name="status" defaultValue="todo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select name="priority" defaultValue="medium">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="due_at">Дедлайн</Label>
              <Input id="due_at" name="due_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select name="client_id" defaultValue={defaultClientId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Не выбран" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сделка</Label>
              <Select name="deal_id" defaultValue={defaultDealId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Не выбрана" />
                </SelectTrigger>
                <SelectContent>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Объект</Label>
              <Select
                name="property_id"
                defaultValue={defaultPropertyId ?? ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Не выбран" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ответственный</Label>
              <Select name="assigned_to" defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="Я" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? "—"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
