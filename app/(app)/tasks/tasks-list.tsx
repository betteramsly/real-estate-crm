"use client";

import * as React from "react";
import { PrefetchLink } from "@/components/prefetch-link";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
} from "@/lib/constants";
import { formatDateTime, initials } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  deleteTaskAction,
  setTaskStatus,
} from "@/lib/actions/tasks";
import type {
  Client,
  Deal,
  Profile,
  Property,
  Task,
  TaskStatus,
} from "@/lib/types";

interface TasksListProps {
  tasks: Task[];
  clients: Pick<Client, "id" | "full_name">[];
  deals: Pick<Deal, "id" | "title">[];
  properties: Pick<Property, "id" | "title">[];
  profiles: Profile[];
}

export function TasksList({
  tasks: initial,
  clients,
  deals,
  properties,
  profiles,
}: TasksListProps) {
  const [tasks, setTasks] = React.useState(initial);

  React.useEffect(() => {
    setTasks(initial);
  }, [initial]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  const toggleDone = async (task: Task) => {
    const next: TaskStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)),
    );
    try {
      await setTaskStatus(task.id, next);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTaskAction(id);
      toast.success("Задача удалена");
    } catch (e) {
      toast.error((e as Error).message);
      setTasks(previous);
    }
  };

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isOverdue =
          task.due_at &&
          new Date(task.due_at).getTime() < Date.now() &&
          task.status !== "done" &&
          task.status !== "cancelled";

        const assignee = task.assigned_to
          ? profileById.get(task.assigned_to)
          : null;
        const client = task.client_id ? clientById.get(task.client_id) : null;
        const deal = task.deal_id ? dealById.get(task.deal_id) : null;
        const property = task.property_id
          ? propertyById.get(task.property_id)
          : null;

        return (
          <Card key={task.id} className="p-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleDone(task)}
                className="mt-0.5 rounded-md text-muted-foreground transition-colors hover:text-primary active:bg-accent active:text-primary"
                aria-label="Переключить статус"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1">
                  <p
                    className={cn(
                      "font-medium",
                      task.status === "done" &&
                        "text-muted-foreground line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 font-medium",
                        TASK_STATUS_VARIANTS[task.status],
                      )}
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 font-medium",
                        TASK_PRIORITY_VARIANTS[task.priority],
                      )}
                    >
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                    {task.due_at ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-muted-foreground",
                          isOverdue && "text-destructive",
                        )}
                      >
                        {isOverdue ? (
                          <Clock className="h-3 w-3" />
                        ) : (
                          <Calendar className="h-3 w-3" />
                        )}
                        {formatDateTime(task.due_at)}
                      </span>
                    ) : null}
                    {client ? (
                      <PrefetchLink
                        href={`/clients/${client.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        · {client.full_name}
                      </PrefetchLink>
                    ) : null}
                    {deal ? (
                      <PrefetchLink
                        href={`/deals/${deal.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        · {deal.title}
                      </PrefetchLink>
                    ) : null}
                    {property ? (
                      <PrefetchLink
                        href={`/properties/${property.id}`}
                        className="text-muted-foreground hover:underline"
                      >
                        · {property.title}
                      </PrefetchLink>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {assignee ? (
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">
                      {initials(assignee.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Изменить статус</DropdownMenuLabel>
                    {(
                      [
                        "todo",
                        "in_progress",
                        "done",
                        "cancelled",
                      ] as TaskStatus[]
                    ).map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={async () => {
                          setTasks((prev) =>
                            prev.map((t) =>
                              t.id === task.id ? { ...t, status: s } : t,
                            ),
                          );
                          try {
                            await setTaskStatus(task.id, s);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        {TASK_STATUS_LABELS[s]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
