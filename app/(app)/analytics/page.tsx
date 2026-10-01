import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckSquare,
  CircleDollarSign,
  Percent,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import { PrefetchLink } from "@/components/prefetch-link";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DealsStageChart } from "../dashboard/deals-stage-chart";
import { FinancialChart } from "./financial-chart";
import {
  ANALYTICS_PERIOD_LABELS,
  computeCompanyAnalytics,
  resolveAnalyticsPeriod,
  type AnalyticsPeriod,
} from "@/lib/analytics";
import { requireProfile } from "@/lib/auth";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANTS,
  DEAL_STAGE_COLORS,
  DEAL_STAGE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_VARIANTS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
  initials,
} from "@/lib/formatters";
import {
  canViewCompanyAnalytics,
  USER_ROLE_LABELS,
} from "@/lib/role-management";
import { cn } from "@/lib/utils";
import type { Client, Deal, Profile, Task } from "@/lib/types";

type AnalyticsClient = Pick<
  Client,
  "id" | "full_name" | "status" | "assigned_to" | "created_at"
>;
type AnalyticsDeal = Pick<
  Deal,
  | "id"
  | "title"
  | "stage"
  | "amount"
  | "commission"
  | "assigned_to"
  | "created_at"
  | "closed_at"
  | "expected_close_date"
>;
type AnalyticsTask = Pick<
  Task,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "due_at"
  | "assigned_to"
  | "created_at"
>;
type AnalyticsProfile = Pick<Profile, "id" | "full_name" | "role">;

const CLIENT_STATUS_BAR = {
  new: "bg-primary",
  in_progress: "bg-gold",
  won: "bg-foreground",
  lost: "bg-destructive",
} as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: rawPeriod } = await searchParams;
  const period = resolveAnalyticsPeriod(rawPeriod);
  const { supabase, profile } = await requireProfile();

  if (!canViewCompanyAnalytics(profile.role, profile.is_owner)) {
    redirect("/dashboard");
  }

  const [clientsResult, dealsResult, tasksResult, profilesResult] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name, status, assigned_to, created_at")
        .returns<AnalyticsClient[]>(),
      supabase
        .from("deals")
        .select(
          "id, title, stage, amount, commission, assigned_to, created_at, closed_at, expected_close_date",
        )
        .returns<AnalyticsDeal[]>(),
      supabase
        .from("tasks")
        .select("id, title, status, priority, due_at, assigned_to, created_at")
        .returns<AnalyticsTask[]>(),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("full_name", { ascending: true })
        .returns<AnalyticsProfile[]>(),
    ]);

  const loadError =
    clientsResult.error ??
    dealsResult.error ??
    tasksResult.error ??
    profilesResult.error;
  if (loadError) {
    throw new Error(`Не удалось загрузить аналитику: ${loadError.message}`);
  }

  const clients = clientsResult.data ?? [];
  const deals = dealsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const now = new Date();
  const analytics = computeCompanyAnalytics({
    clients,
    deals,
    tasks,
    profiles,
    period,
    now,
  });
  const maxClientStatus = Math.max(
    1,
    ...analytics.clientStatuses.map((row) => row.count),
  );
  const dateRange = `${formatDate(analytics.periodStart)} — ${formatDate(now)}`;

  return (
    <>
      <PageHeader
        title="Аналитика"
        description={`Результаты всей команды за ${ANALYTICS_PERIOD_LABELS[period].toLowerCase()} · ${dateRange}`}
        actions={<PeriodFilter period={period} />}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <ScopeLink href="/clients" label="Все клиенты" value={clients.length} />
        <ScopeLink href="/deals" label="Все сделки" value={deals.length} />
        <ScopeLink href="/tasks" label="Все задачи" value={tasks.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="Заработок компании"
          value={formatCurrency(analytics.companyRevenue)}
          hint={`${analytics.wonDeals} успешно закрытых сделок`}
        />
        <KpiCard
          icon={<WalletCards className="h-4 w-4" />}
          label="Валовый объём"
          value={formatCurrency(analytics.grossVolume)}
          hint="Сумма успешно закрытых сделок"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Текущая воронка"
          value={formatCurrency(analytics.currentPipelineAmount)}
          hint={`${analytics.currentPipelineCount} активных сделок`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4" />}
          label="Новые клиенты"
          value={formatNumber(analytics.clientsCreated)}
          hint={`${analytics.dealsCreated} новых сделок за период`}
        />
        <KpiCard
          icon={<Percent className="h-4 w-4" />}
          label="Конверсия закрытия"
          value={
            analytics.conversionRate === null
              ? "—"
              : `${analytics.conversionRate.toFixed(1)}%`
          }
          hint="Успешные среди всех закрытых сделок"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Просроченные задачи"
          value={formatNumber(analytics.overdueTasks)}
          hint={`${analytics.openTasks} открытых задач сейчас`}
          danger={analytics.overdueTasks > 0}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Динамика финансов</CardTitle>
            <CardDescription>
              Валовый объём и комиссия по успешно закрытым сделкам
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FinancialChart data={analytics.financialTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статусы клиентов</CardTitle>
            <CardDescription>Клиенты, добавленные за выбранный период</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.clientStatuses.map((row) => (
              <div key={row.status} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      CLIENT_STATUS_VARIANTS[row.status],
                    )}
                  >
                    {CLIENT_STATUS_LABELS[row.status]}
                  </span>
                  <span className="font-medium">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", CLIENT_STATUS_BAR[row.status])}
                    style={{ width: `${(row.count / maxClientStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Воронка сделок</CardTitle>
          <CardDescription>Сделки, созданные за выбранный период</CardDescription>
        </CardHeader>
        <CardContent>
          <DealsStageChart
            data={analytics.dealStages.map((row) => ({
              ...row,
              label: DEAL_STAGE_LABELS[row.stage],
              color: DEAL_STAGE_COLORS[row.stage],
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Результаты команды</CardTitle>
          <CardDescription>
            Клиенты и сделки относятся к выбранному периоду; активные клиенты и
            задачи — текущий снимок
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table className="min-w-[1180px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Сотрудник</TableHead>
                <TableHead>Новые клиенты</TableHead>
                <TableHead>Активные клиенты</TableHead>
                <TableHead>Новые сделки</TableHead>
                <TableHead>Успешные</TableHead>
                <TableHead>Валовый объём</TableHead>
                <TableHead>Комиссия</TableHead>
                <TableHead>Открытые задачи</TableHead>
                <TableHead className="pr-6">Просрочено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.team.map((row) => (
                <TableRow key={row.id || "unassigned"}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials(row.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.role ? USER_ROLE_LABELS[row.role] : "Проверьте назначения"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.clientsCreated}</TableCell>
                  <TableCell>{row.activeClients}</TableCell>
                  <TableCell>{row.dealsCreated}</TableCell>
                  <TableCell>{row.wonDeals}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(row.grossVolume)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatCurrency(row.companyRevenue)}
                  </TableCell>
                  <TableCell>{row.openTasks}</TableCell>
                  <TableCell className="pr-6">
                    <span className={cn(row.overdueTasks > 0 && "text-destructive")}>
                      {row.overdueTasks}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Новые клиенты
              </CardTitle>
              <CardDescription>Последние за выбранный период</CardDescription>
            </div>
            <PrefetchLink
              href="/clients"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Все
            </PrefetchLink>
          </CardHeader>
          <CardContent>
            {analytics.recentClients.length ? (
              <ul className="space-y-2">
                {analytics.recentClients.map((client) => (
                  <li key={client.id}>
                    <PrefetchLink
                      href={`/clients/${client.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{client.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelative(client.created_at)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
                    </PrefetchLink>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyList>За этот период новых клиентов нет.</EmptyList>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <BriefcaseBusiness className="h-4 w-4" /> Ближайшие закрытия
              </CardTitle>
              <CardDescription>Активные сделки с ожидаемой датой</CardDescription>
            </div>
            <PrefetchLink
              href="/deals"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Все
            </PrefetchLink>
          </CardHeader>
          <CardContent>
            {analytics.upcomingDeals.length ? (
              <ul className="space-y-2">
                {analytics.upcomingDeals.map((deal) => {
                  const overdue =
                    deal.expected_close_date &&
                    new Date(deal.expected_close_date).getTime() < now.getTime();
                  return (
                    <li key={deal.id}>
                      <PrefetchLink
                        href={`/deals/${deal.id}`}
                        className="block rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <p className="truncate font-medium">{deal.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                          <span className={cn("text-muted-foreground", overdue && "text-destructive")}>
                            {overdue ? "Просрочена · " : ""}
                            {formatDate(deal.expected_close_date)}
                          </span>
                          <span>{formatCurrency(deal.amount)}</span>
                        </div>
                      </PrefetchLink>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyList>У активных сделок не указаны даты закрытия.</EmptyList>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" /> Просроченные задачи
              </CardTitle>
              <CardDescription>Требуют внимания команды</CardDescription>
            </div>
            <PrefetchLink
              href="/tasks"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Все
            </PrefetchLink>
          </CardHeader>
          <CardContent>
            {analytics.urgentTasks.length ? (
              <ul className="space-y-2">
                {analytics.urgentTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{task.title}</p>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-medium",
                          TASK_PRIORITY_VARIANTS[task.priority],
                        )}
                      >
                        {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-destructive">
                      {formatDateTime(task.due_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyList>Просроченных задач нет.</EmptyList>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Заработок компании считается как сумма поля «Комиссия» по успешно
        закрытым сделкам. Валовый объём — сумма самих успешно закрытых сделок.
      </p>
    </>
  );
}

function PeriodFilter({ period }: { period: AnalyticsPeriod }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Период аналитики">
      {(Object.keys(ANALYTICS_PERIOD_LABELS) as AnalyticsPeriod[]).map((item) => (
        <PrefetchLink
          key={item}
          href={`/analytics?period=${item}`}
          className={buttonVariants({
            variant: item === period ? "default" : "outline",
            size: "sm",
          })}
          aria-current={item === period ? "page" : undefined}
        >
          {ANALYTICS_PERIOD_LABELS[item]}
        </PrefetchLink>
      ))}
    </div>
  );
}

function ScopeLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <PrefetchLink
      href={href}
      className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
    >
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{formatNumber(value)}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </PrefetchLink>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span
          className={cn(
            "rounded-md bg-primary/10 p-1.5 text-primary",
            danger && "bg-destructive/10 text-destructive",
          )}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", danger && "text-destructive")}>
          {value}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
