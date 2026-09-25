"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon, Clock3, Loader2 } from "lucide-react";
import { SearchableSelect } from "@/components/searchable-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
import type { Client, Deal, Profile, Property, UserRole } from "@/lib/types";

interface TaskFormDialogProps {
  trigger: React.ReactNode;
  clients: Pick<Client, "id" | "full_name">[];
  deals: Pick<Deal, "id" | "title">[];
  properties: Pick<Property, "id" | "title">[];
  profiles: Profile[];
  currentUserId: string;
  currentRole: UserRole;
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
  currentUserId,
  currentRole,
  defaultClientId,
  defaultDealId,
  defaultPropertyId,
}: TaskFormDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [dueDate, setDueDate] = React.useState<Date | undefined>();
  const [dueTime, setDueTime] = React.useState("12:00");
  const [timezoneOffset, setTimezoneOffset] = React.useState(0);
  const [state, formAction] = useActionState<TaskFormState, FormData>(
    createTaskAction,
    {},
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  React.useEffect(() => {
    setTimezoneOffset(new Date().getTimezoneOffset());
  }, []);

  const canAssignOthers = currentRole === "admin";
  const assignableProfiles = canAssignOthers
    ? profiles
    : profiles.filter((profile) => profile.id === currentUserId);
  const dueAtValue = dueDate
    ? `${format(dueDate, "yyyy-MM-dd")}T${dueTime || "12:00"}`
    : "";

  const selectDueDate = (date: Date | undefined) => {
    setDueDate(date);
    if (date) setCalendarOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span className="inline-flex">{trigger}</span>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input
            type="hidden"
            name="timezone_offset"
            value={timezoneOffset}
          />
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
              <Label htmlFor="due_at_date">Дедлайн</Label>
              <input type="hidden" name="due_at" value={dueAtValue} />
              <div className="grid gap-2 sm:grid-cols-[1fr_132px]">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger
                    id="due_at_date"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-start rounded-md text-left font-normal",
                      !dueDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dueDate ? (
                      format(dueDate, "d MMMM yyyy", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden rounded-xl p-0 shadow-xl"
                    align="start"
                  >
                    <div className="border-b bg-muted/40 px-4 py-3">
                      <p className="text-sm font-medium">Дата дедлайна</p>
                      <p className="text-xs text-muted-foreground">
                        Выберите день в календаре
                      </p>
                    </div>
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={selectDueDate}
                      locale={ru}
                    />
                    <div className="flex items-center justify-between gap-2 border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => selectDueDate(new Date())}
                      >
                        Сегодня
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!dueDate}
                        onClick={() => selectDueDate(undefined)}
                      >
                        Очистить
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="due_at_time"
                    type="time"
                    value={dueTime}
                    onChange={(event) => setDueTime(event.target.value)}
                    aria-label="Время дедлайна"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_client_id">Клиент</Label>
              <SearchableSelect
                id="task_client_id"
                name="client_id"
                defaultValue={defaultClientId ?? ""}
                options={clients.map((client) => ({
                  value: client.id,
                  label: client.full_name,
                }))}
                placeholder="Не выбран"
                clearLabel="Без клиента"
                searchPlaceholder="Найти клиента..."
                emptyText="Клиент не найден"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_deal_id">Сделка</Label>
              <SearchableSelect
                id="task_deal_id"
                name="deal_id"
                defaultValue={defaultDealId ?? ""}
                options={deals.map((deal) => ({
                  value: deal.id,
                  label: deal.title,
                }))}
                placeholder="Не выбрана"
                clearLabel="Без сделки"
                searchPlaceholder="Найти сделку..."
                emptyText="Сделка не найдена"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task_property_id">Объект</Label>
              <SearchableSelect
                id="task_property_id"
                name="property_id"
                defaultValue={defaultPropertyId ?? ""}
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.title,
                }))}
                placeholder="Не выбран"
                clearLabel="Без объекта"
                searchPlaceholder="Найти объект..."
                emptyText="Объект не найден"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Ответственный</Label>
              {!canAssignOthers ? (
                <input
                  type="hidden"
                  name="assigned_to"
                  value={currentUserId}
                />
              ) : null}
              <Select
                name={canAssignOthers ? "assigned_to" : undefined}
                defaultValue={currentUserId}
                disabled={!canAssignOthers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Я" />
                </SelectTrigger>
                <SelectContent>
                  {assignableProfiles.map((p) => (
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
