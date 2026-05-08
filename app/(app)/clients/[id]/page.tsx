import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientForm } from "../client-form";
import { DeleteClientButton } from "./delete-client-button";
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
import { cn } from "@/lib/utils";
import type { Client, Deal, Profile, Task } from "@/lib/types";

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

  const [{ data: profiles }, { data: deals }, { data: tasks }] =
    await Promise.all([
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
    ]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
            К клиентам
          </Link>
        </Button>
      </div>

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

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
          <TabsTrigger value="deals">Сделки ({deals?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">Задачи ({tasks?.length ?? 0})</TabsTrigger>
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
                <p className="py-6 text-center text-sm text-muted-foreground">
                  У клиента ещё нет сделок
                </p>
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
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {TASK_STATUS_LABELS[task.status]} ·{" "}
                        {formatDate(task.due_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  У клиента нет задач
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
