import { notFound } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Plus,
  UserCircle2,
} from "lucide-react";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MatchedProperties } from "@/components/matched-properties";
import { PrefetchLink } from "@/components/prefetch-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "../client-form";
import { DeleteClientButton } from "./delete-client-button";
import { TaskFormDialog } from "../../tasks/task-form-dialog";
import { getActivities } from "@/lib/actions/activities";
import { requireProfile } from "@/lib/auth";
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANTS,
  DEAL_STAGE_LABELS,
  DEAL_TYPE_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatRelative,
  initials,
} from "@/lib/formatters";
import { matchPropertiesForClient } from "@/lib/matching";
import { cn } from "@/lib/utils";
import type { Client, Deal, Profile, Property, Task } from "@/lib/types";

export default async function ClientPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await requireProfile();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Client>();

  if (!client) notFound();

  const [
    { data: profiles },
    { data: deals },
    { data: tasks },
    { data: allProperties },
    activities,
  ] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase
      .from("deals")
      .select("*")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false })
      .returns<Deal[]>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("client_id", params.id)
      .order("due_at", { ascending: true })
      .returns<Task[]>(),
    supabase
      .from("properties")
      .select("*")
      .eq("status", "active")
      .returns<Property[]>(),
    getActivities({ clientId: params.id, limit: 50 }),
  ]);

  const assignee = profiles?.find((p) => p.id === client.assigned_to) ?? null;
  const openTasks = (tasks ?? []).filter(
    (t) => t.status === "todo" || t.status === "in_progress",
  );
  const nextTask = openTasks.find((t) => t.due_at) ?? openTasks[0] ?? null;
  const matches = matchPropertiesForClient(client, allProperties ?? []);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Клиенты", href: "/clients" },
          { label: client.full_name },
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initials(client.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-semibold">{client.full_name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                  CLIENT_STATUS_VARIANTS[client.status],
                )}
              >
                {CLIENT_STATUS_LABELS[client.status]}
              </span>
              <Badge variant="outline">
                {DEAL_TYPE_LABELS[client.deal_type]}
              </Badge>
              <span>· {CLIENT_SOURCE_LABELS[client.source]}</span>
              <span>· создан {formatRelative(client.created_at)}</span>
            </div>
          </div>
        </div>
        <DeleteClientButton id={client.id} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCircle2 className="h-3.5 w-3.5" />
              Ответственный
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Avatar className="h-7 w-7">
                {assignee?.avatar_url ? (
                  <AvatarImage src={assignee.avatar_url} alt="" />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {assignee ? initials(assignee.full_name) : "—"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {assignee?.full_name ?? "Не назначен"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Следующее действие
            </p>
            {nextTask ? (
              <div className="space-y-1 pt-1">
                <p className="line-clamp-1 text-sm font-medium">
                  {nextTask.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextTask.due_at
                    ? formatDate(nextTask.due_at)
                    : TASK_STATUS_LABELS[nextTask.status]}
                </p>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <p className="text-sm text-muted-foreground">
                  Нет открытых задач
                </p>
                <TaskFormDialog
                  clients={[{ id: client.id, full_name: client.full_name }]}
                  deals={(deals ?? []).map((d) => ({
                    id: d.id,
                    title: d.title,
                  }))}
                  properties={(allProperties ?? []).map((p) => ({
                    id: p.id,
                    title: p.title,
                  }))}
                  profiles={profiles ?? []}
                  defaultClientId={client.id}
                  trigger={
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Добавить задачу
                    </Button>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              Активные сделки
            </p>
            <p className="pt-1 text-2xl font-semibold">
              {(deals ?? []).filter(
                (d) =>
                  d.stage !== "closed_won" && d.stage !== "closed_lost",
              ).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <PrefetchLink href={`/deals/new?client_id=${client.id}`}>
            <Plus className="h-4 w-4" />
            Создать сделку
          </PrefetchLink>
        </Button>
        <TaskFormDialog
          clients={[{ id: client.id, full_name: client.full_name }]}
          deals={(deals ?? []).map((d) => ({ id: d.id, title: d.title }))}
          properties={(allProperties ?? []).map((p) => ({
            id: p.id,
            title: p.title,
          }))}
          profiles={profiles ?? []}
          defaultClientId={client.id}
          trigger={
            <Button size="sm" variant="outline">
              <ListTodo className="h-4 w-4" />
              Создать задачу
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="matching">
            Подбор ({matches.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Активность</TabsTrigger>
          <TabsTrigger value="deals">Сделки ({deals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">Задачи ({tasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Контакты</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Телефон</span>
                  <span>{client.phone ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{client.email ?? "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Параметры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Бюджет</span>
                  <span>
                    {client.budget_min || client.budget_max
                      ? `${formatCurrency(client.budget_min)} — ${formatCurrency(client.budget_max)}`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Тип</span>
                  <span>{DEAL_TYPE_LABELS[client.deal_type]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Источник</span>
                  <span>{CLIENT_SOURCE_LABELS[client.source]}</span>
                </div>
              </CardContent>
            </Card>

            {client.notes ? (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Заметки</CardTitle>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-line">
                  {client.notes}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="matching">
          <MatchedProperties
            matches={matches}
            emptyText="Нет объектов, подходящих под бюджет и тип сделки"
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="p-6">
              <ActivityTimeline
                activities={activities}
                emptyText="Здесь появятся события: создание сделок, изменение этапов, задачи"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <ClientForm
            client={client}
            profiles={profiles ?? []}
            currentRole={profile.role}
          />
        </TabsContent>

        <TabsContent value="deals">
          <Card>
            <CardContent className="p-4">
              {deals && deals.length > 0 ? (
                <ul className="divide-y">
                  {deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <PrefetchLink
                          href={`/deals/${deal.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {deal.title}
                        </PrefetchLink>
                        <p className="text-xs text-muted-foreground">
                          {DEAL_STAGE_LABELS[deal.stage]} ·{" "}
                          {formatDate(deal.expected_close_date)}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-medium">
                        {formatCurrency(deal.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    У клиента ещё нет сделок
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <PrefetchLink href={`/deals/new?client_id=${client.id}`}>
                      <Plus className="h-4 w-4" />
                      Создать первую сделку
                    </PrefetchLink>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="p-4">
              {tasks && tasks.length > 0 ? (
                <ul className="divide-y">
                  {tasks.map((task) => (
                    <li key={task.id} className="py-3">
                      <p className="font-medium">
                        {task.status === "done" ? (
                          <CheckCircle2 className="mr-1 inline-block h-4 w-4 text-emerald-500" />
                        ) : null}
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {TASK_STATUS_LABELS[task.status]} ·{" "}
                        {formatDate(task.due_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    У клиента нет задач
                  </p>
                  <TaskFormDialog
                    clients={[{ id: client.id, full_name: client.full_name }]}
                    deals={(deals ?? []).map((d) => ({
                      id: d.id,
                      title: d.title,
                    }))}
                    properties={(allProperties ?? []).map((p) => ({
                      id: p.id,
                      title: p.title,
                    }))}
                    profiles={profiles ?? []}
                    defaultClientId={client.id}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4" />
                        Создать задачу
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
