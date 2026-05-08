import Link from "next/link";
import {
  Building2,
  CheckSquare,
  Clock,
  Handshake,
  TrendingUp,
  Users,
} from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { DealsRevenueChart } from "./deals-revenue-chart";
import { DealsStageChart } from "./deals-stage-chart";
import { requireProfile } from "@/lib/auth";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANTS,
  DEAL_STAGE_COLORS,
  DEAL_STAGE_LABELS,
  TASK_PRIORITY_VARIANTS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDateTime,
  formatRelative,
  initials,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Client, Deal, Task } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, profile } = await requireProfile();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    { data: deals },
    { data: tasks },
    { data: recentClients },
    { count: clientsCount },
    { count: propertiesCount },
    { count: newClients30dCount },
    { count: wonDeals30dCount },
  ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "id, title, client_id, property_id, stage, amount, commission, expected_close_date, closed_at, notes, assigned_to, created_by, created_at, updated_at",
      )
      .gte("created_at", sixMonthsAgo.toISOString())
      .returns<Deal[]>(),
    supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, due_at, client_id, deal_id, property_id, assigned_to, created_by, created_at, updated_at",
      )
      .neq("status", "done")
      .neq("status", "cancelled")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(6)
      .returns<Task[]>(),
    supabase
      .from("clients")
      .select(
        "id, full_name, phone, email, source, status, budget_min, budget_max, deal_type, notes, assigned_to, created_by, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<Client[]>(),
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("deals")
      .select("*", { count: "exact", head: true })
      .eq("stage", "closed_won")
      .gte("closed_at", thirtyDaysAgo.toISOString()),
  ]);

  const allDeals = deals ?? [];
  const totalPipeline = allDeals
    .filter(
      (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
    )
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const wonAmount = allDeals
    .filter((d) => d.stage === "closed_won")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const stageData = (
    Object.keys(DEAL_STAGE_LABELS) as (keyof typeof DEAL_STAGE_LABELS)[]
  ).map((s) => ({
    stage: s,
    label: DEAL_STAGE_LABELS[s],
    color: DEAL_STAGE_COLORS[s],
    count: allDeals.filter((d) => d.stage === s).length,
    amount: allDeals
      .filter((d) => d.stage === s)
      .reduce((sum, d) => sum + (d.amount ?? 0), 0),
  }));

  const monthly = computeMonthlyRevenue(allDeals, 6);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <>
      <PageHeader
        title={`Привет, ${profile.full_name ?? "коллега"}`}
        description="Сводка по работе агентства за последние 30 дней"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Клиентов всего"
          value={String(clientsCount ?? 0)}
          hint={`+${newClients30dCount ?? 0} за 30 дней`}
        />
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Объектов"
          value={String(propertiesCount ?? 0)}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Сумма в воронке"
          value={formatCurrency(totalPipeline)}
        />
        <KpiCard
          icon={<Handshake className="h-4 w-4" />}
          label="Закрыто за 30 дней"
          value={String(wonDeals30dCount ?? 0)}
          hint={formatCurrency(wonAmount)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Сумма сделок по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <DealsRevenueChart data={monthly} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Воронка</CardTitle>
          </CardHeader>
          <CardContent>
            <DealsStageChart data={stageData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Задачи на ближайшее время
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/tasks">Все задачи</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasks && tasks.length > 0 ? (
              <ul className="space-y-2">
                {tasks.map((task) => {
                  const isOverdue =
                    task.due_at &&
                    new Date(task.due_at).getTime() < Date.now();
                  return (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{task.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 font-medium",
                              TASK_PRIORITY_VARIANTS[task.priority],
                            )}
                          >
                            {task.priority === "high"
                              ? "Высокий"
                              : task.priority === "medium"
                                ? "Средний"
                                : "Низкий"}
                          </span>
                          {task.due_at ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-muted-foreground",
                                isOverdue && "text-destructive",
                              )}
                            >
                              <Clock className="h-3 w-3" />
                              {formatDateTime(task.due_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Свободно — задач нет.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Последние клиенты
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clients">Все клиенты</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentClients && recentClients.length > 0 ? (
              <ul className="space-y-2">
                {recentClients.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <PrefetchLink
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {initials(c.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium hover:underline">
                          {c.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(c.created_at)}
                        </p>
                      </div>
                    </PrefetchLink>
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        CLIENT_STATUS_VARIANTS[c.status],
                      )}
                    >
                      {CLIENT_STATUS_LABELS[c.status]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Клиентов пока нет.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function computeMonthlyRevenue(deals: Deal[], months: number) {
  const result: { month: string; amount: number; won: number }[] = [];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ru-RU", { month: "short" });

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthDeals = deals.filter((deal) => {
      const created = new Date(deal.created_at);
      return (
        created.getFullYear() === year && created.getMonth() === month
      );
    });
    const wonDeals = monthDeals.filter((d) => d.stage === "closed_won");
    result.push({
      month: formatter.format(d),
      amount: monthDeals.reduce((s, d) => s + (d.amount ?? 0), 0),
      won: wonDeals.reduce((s, d) => s + (d.amount ?? 0), 0),
    });
  }

  return result;
}
