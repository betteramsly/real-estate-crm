"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon, Check, ChevronDown, Clock3, Loader2 } from "lucide-react";
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

const DEADLINE_HOURS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0"),
);
const DEADLINE_MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

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
  const [timeOpen, setTimeOpen] = React.useState(false);
  const [dueDate, setDueDate] = React.useState<Date | undefined>();
  const [dueTime, setDueTime] = React.useState("12:00");
  const hoursListRef = React.useRef<HTMLDivElement>(null);
  const minutesListRef = React.useRef<HTMLDivElement>(null);
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

  React.useEffect(() => {
    if (!timeOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const selectedHour = Number(dueTime.split(":")[0]);
      const selectedMinute = Number(dueTime.split(":")[1]) / 5;
      if (hoursListRef.current) {
        hoursListRef.current.scrollTop = Math.max(
          0,
          selectedHour * 36 - 64,
        );
      }
      if (minutesListRef.current) {
        minutesListRef.current.scrollTop = Math.max(
          0,
          selectedMinute * 36 - 64,
        );
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [dueTime, timeOpen]);

  const canAssignOthers = currentRole === "admin";
  const assignableProfiles = canAssignOthers
    ? profiles
    : profiles.filter((profile) => profile.id === currentUserId);
  const dueAtValue = dueDate
    ? `${format(dueDate, "yyyy-MM-dd")}T${dueTime || "12:00"}`
    : "";
  const [dueHour, dueMinute] = dueTime.split(":");

  const selectDueDate = (date: Date | undefined) => {
    setDueDate(date);
    if (date) setCalendarOpen(false);
  };

  const scrollTimeColumn = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.scrollTop += event.deltaY;
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
                    sideOffset={8}
                    collisionPadding={12}
                  >
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={selectDueDate}
                      locale={ru}
                    />
                    <div className="flex items-center justify-between gap-2 border-t p-1.5">
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
                <Popover open={timeOpen} onOpenChange={setTimeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="due_at_time"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-label="Время дедлайна"
                      aria-expanded={timeOpen}
                      className="w-full justify-between rounded-md px-3 font-normal"
                    >
                      <span className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        {dueTime}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    onOpenAutoFocus={(event) => event.preventDefault()}
                    className="w-64 overflow-hidden rounded-xl p-0 shadow-xl"
                  >
                    <div className="border-b bg-muted/40 px-3 py-2.5">
                      <p className="text-sm font-medium">Время дедлайна</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2">
                      <div className="space-y-1.5">
                        <p className="px-1 text-xs font-medium text-muted-foreground">
                          Часы
                        </p>
                        <div
                          ref={hoursListRef}
                          role="listbox"
                          aria-label="Часы"
                          onWheel={scrollTimeColumn}
                          className="scrollbar-thin h-36 touch-pan-y space-y-1 overflow-y-auto overscroll-contain pr-1"
                        >
                          {DEADLINE_HOURS.map((hour) => (
                            <button
                              key={hour}
                              type="button"
                              role="option"
                              aria-selected={dueHour === hour}
                              onClick={() => setDueTime(`${hour}:${dueMinute}`)}
                              className={cn(
                                "flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-sm transition-colors hover:bg-accent",
                                dueHour === hour &&
                                  "bg-primary text-primary-foreground hover:bg-primary",
                              )}
                            >
                              {hour}
                              {dueHour === hour ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="px-1 text-xs font-medium text-muted-foreground">
                          Минуты
                        </p>
                        <div
                          ref={minutesListRef}
                          role="listbox"
                          aria-label="Минуты"
                          onWheel={scrollTimeColumn}
                          className="scrollbar-thin h-36 touch-pan-y space-y-1 overflow-y-auto overscroll-contain pr-1"
                        >
                          {DEADLINE_MINUTES.map((minute) => (
                            <button
                              key={minute}
                              type="button"
                              role="option"
                              aria-selected={dueMinute === minute}
                              onClick={() => setDueTime(`${dueHour}:${minute}`)}
                              className={cn(
                                "flex h-8 w-full items-center justify-between rounded-lg px-2.5 text-sm transition-colors hover:bg-accent",
                                dueMinute === minute &&
                                  "bg-primary text-primary-foreground hover:bg-primary",
                              )}
                            >
                              {minute}
                              {dueMinute === minute ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="border-t p-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        onClick={() => setTimeOpen(false)}
                      >
                        Готово
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
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
