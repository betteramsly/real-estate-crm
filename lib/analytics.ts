import type {
  Client,
  ClientStatus,
  Deal,
  DealStage,
  Profile,
  Task,
  UserRole,
} from "@/lib/types";
import { isRealtorRole } from "@/lib/role-management";

export const ANALYTICS_PERIOD_LABELS = {
  "30d": "30 дней",
  "90d": "90 дней",
  year: "Текущий год",
} as const;

export type AnalyticsPeriod = keyof typeof ANALYTICS_PERIOD_LABELS;
export type AnalyticsPeriodSelection = AnalyticsPeriod | "custom";

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
  selection: AnalyticsPeriodSelection;
  from: string;
  to: string;
}

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

type AnalyticsProfile = Pick<
  Profile,
  "id" | "full_name" | "role" | "company_commission_percent"
>;

export interface AnalyticsTeamRow {
  id: string;
  name: string;
  role: UserRole | null;
  clientsCreated: number;
  activeClients: number;
  dealsCreated: number;
  wonDeals: number;
  grossVolume: number;
  companyCommissionPercent: number | null;
  realtorEarnings: number;
  openTasks: number;
  overdueTasks: number;
}

export interface AnalyticsResult {
  periodStart: Date;
  periodEnd: Date;
  clientsCreated: number;
  dealsCreated: number;
  tasksCreated: number;
  wonDeals: number;
  grossVolume: number;
  realtorEarnings: number;
  conversionRate: number | null;
  currentPipelineAmount: number;
  currentPipelineCount: number;
  openTasks: number;
  overdueTasks: number;
  clientStatuses: Array<{
    status: ClientStatus;
    count: number;
  }>;
  dealStages: Array<{
    stage: DealStage;
    count: number;
    amount: number;
  }>;
  financialTrend: Array<{
    label: string;
    gross: number;
    realtorEarnings: number;
  }>;
  team: AnalyticsTeamRow[];
  recentClients: AnalyticsClient[];
  urgentTasks: AnalyticsTask[];
  upcomingDeals: AnalyticsDeal[];
}

export function resolveAnalyticsPeriod(value: string | undefined): AnalyticsPeriod {
  return value && value in ANALYTICS_PERIOD_LABELS
    ? (value as AnalyticsPeriod)
    : "30d";
}

export function analyticsPeriodStart(period: AnalyticsPeriod, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "year") {
    start.setMonth(0, 1);
    return start;
  }

  start.setDate(start.getDate() - (period === "90d" ? 89 : 29));
  return start;
}

function parseDateInput(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;

  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatAnalyticsDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveAnalyticsDateRange(
  input: { period?: string; from?: string; to?: string },
  now = new Date(),
): AnalyticsDateRange {
  if (input.period === "custom") {
    const customStart = parseDateInput(input.from);
    const customEnd = parseDateInput(input.to, true);
    if (customStart && customEnd && customStart <= customEnd) {
      return {
        start: customStart,
        end: customEnd,
        selection: "custom",
        from: formatAnalyticsDateInput(customStart),
        to: formatAnalyticsDateInput(customEnd),
      };
    }
  }

  const period = resolveAnalyticsPeriod(input.period);
  const start = analyticsPeriodStart(period, now);
  return {
    start,
    end: now,
    selection: period,
    from: formatAnalyticsDateInput(start),
    to: formatAnalyticsDateInput(now),
  };
}

function timestamp(value: string | null | undefined) {
  if (!value) return null;
  const result = new Date(value).getTime();
  return Number.isNaN(result) ? null : result;
}

function inRange(
  value: string | null | undefined,
  start: Date,
  end: Date,
) {
  const time = timestamp(value);
  return time !== null && time >= start.getTime() && time <= end.getTime();
}

function total<T>(rows: T[], getValue: (row: T) => number | null) {
  return rows.reduce((sum, row) => sum + (getValue(row) ?? 0), 0);
}

export function calculateRealtorEarnings(
  commission: number | null,
  companyCommissionPercent: number,
) {
  const normalizedPercent = Number(companyCommissionPercent);
  if (
    !Number.isFinite(normalizedPercent) ||
    normalizedPercent < 0 ||
    normalizedPercent > 100
  ) {
    throw new Error("Процент компании должен быть от 0 до 100");
  }

  const commissionAmount = commission ?? 0;
  return (
    Math.round(
      commissionAmount * (1 - normalizedPercent / 100) * 100,
    ) / 100
  );
}

function isOpenDeal(deal: Pick<Deal, "stage">) {
  return deal.stage !== "closed_won" && deal.stage !== "closed_lost";
}

function isOpenTask(task: Pick<Task, "status">) {
  return task.status === "todo" || task.status === "in_progress";
}

function createTrendBuckets(start: Date, end: Date) {
  const spanDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
  );
  const useMonthlyBuckets = spanDays > 120;
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: useMonthlyBuckets ? undefined : "numeric",
    month: "short",
  });
  const buckets: Array<{ start: Date; end: Date; label: string }> = [];

  if (useMonthlyBuckets) {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor.getTime() <= end.getTime()) {
      const bucketStart = new Date(cursor);
      const bucketEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      buckets.push({
        start:
          bucketStart.getTime() < start.getTime() ? new Date(start) : bucketStart,
        end: bucketEnd.getTime() > end.getTime() ? new Date(end) : bucketEnd,
        label: formatter.format(bucketStart),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  }

  const bucketDays = spanDays > 31 ? 14 : 5;
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + bucketDays - 1);
    bucketEnd.setHours(23, 59, 59, 999);
    buckets.push({
      start: bucketStart,
      end: bucketEnd.getTime() > end.getTime() ? new Date(end) : bucketEnd,
      label: formatter.format(bucketStart),
    });
    cursor.setDate(cursor.getDate() + bucketDays);
  }
  return buckets;
}

export function computeCompanyAnalytics(input: {
  clients: AnalyticsClient[];
  deals: AnalyticsDeal[];
  tasks: AnalyticsTask[];
  profiles: AnalyticsProfile[];
  period: AnalyticsPeriod;
  periodStart?: Date;
  periodEnd?: Date;
  now?: Date;
}): AnalyticsResult {
  const now = input.now ?? new Date();
  const periodStart = input.periodStart ?? analyticsPeriodStart(input.period, now);
  const periodEnd = input.periodEnd ?? now;
  const companyPercentByProfile = new Map(
    input.profiles.map((profile) => [
      profile.id,
      Number(profile.company_commission_percent),
    ]),
  );
  const realtorEarningsForDeal = (deal: AnalyticsDeal) =>
    calculateRealtorEarnings(
      deal.commission,
      deal.assigned_to
        ? (companyPercentByProfile.get(deal.assigned_to) ?? 0)
        : 0,
    );
  const periodClients = input.clients.filter((client) =>
    inRange(client.created_at, periodStart, periodEnd),
  );
  const periodDeals = input.deals.filter((deal) =>
    inRange(deal.created_at, periodStart, periodEnd),
  );
  const periodTasks = input.tasks.filter((task) =>
    inRange(task.created_at, periodStart, periodEnd),
  );
  const closedDeals = input.deals.filter(
    (deal) =>
      (deal.stage === "closed_won" || deal.stage === "closed_lost") &&
      inRange(deal.closed_at, periodStart, periodEnd),
  );
  const wonDeals = closedDeals.filter((deal) => deal.stage === "closed_won");
  const currentPipeline = input.deals.filter(isOpenDeal);
  const openTasks = input.tasks.filter(isOpenTask);
  const urgentTasks = openTasks
    .filter((task) => {
      const dueAt = timestamp(task.due_at);
      return dueAt !== null && dueAt < now.getTime();
    })
    .sort((a, b) => (timestamp(a.due_at) ?? 0) - (timestamp(b.due_at) ?? 0));

  const clientStatuses = (
    ["new", "in_progress", "won", "lost"] as ClientStatus[]
  ).map((status) => ({
    status,
    count: periodClients.filter((client) => client.status === status).length,
  }));

  const dealStages = (
    [
      "new",
      "viewing",
      "negotiation",
      "contract",
      "closed_won",
      "closed_lost",
    ] as DealStage[]
  ).map((stage) => {
    const rows = periodDeals.filter((deal) => deal.stage === stage);
    return {
      stage,
      count: rows.length,
      amount: total(rows, (deal) => deal.amount),
    };
  });

  const financialTrend = createTrendBuckets(periodStart, periodEnd).map(
    (bucket) => {
      const rows = wonDeals.filter((deal) =>
        inRange(deal.closed_at, bucket.start, bucket.end),
      );
      return {
        label: bucket.label,
        gross: total(rows, (deal) => deal.amount),
        realtorEarnings: total(rows, realtorEarningsForDeal),
      };
    },
  );

  const buildTeamRow = (
    id: string,
    name: string,
    role: UserRole | null,
    companyCommissionPercent: number | null,
  ): AnalyticsTeamRow => {
    const assignedPeriodClients = periodClients.filter(
      (client) => client.assigned_to === id,
    );
    const assignedPeriodDeals = periodDeals.filter(
      (deal) => deal.assigned_to === id,
    );
    const assignedWonDeals = wonDeals.filter((deal) => deal.assigned_to === id);
    const assignedOpenTasks = openTasks.filter((task) => task.assigned_to === id);
    return {
      id,
      name,
      role,
      clientsCreated: assignedPeriodClients.length,
      activeClients: input.clients.filter(
        (client) =>
          client.assigned_to === id &&
          (client.status === "new" || client.status === "in_progress"),
      ).length,
      dealsCreated: assignedPeriodDeals.length,
      wonDeals: assignedWonDeals.length,
      grossVolume: total(assignedWonDeals, (deal) => deal.amount),
      companyCommissionPercent,
      realtorEarnings: total(assignedWonDeals, realtorEarningsForDeal),
      openTasks: assignedOpenTasks.length,
      overdueTasks: urgentTasks.filter((task) => task.assigned_to === id).length,
    };
  };

  const team = input.profiles.map((profile) =>
    buildTeamRow(
      profile.id,
      profile.full_name?.trim() || "Без имени",
      profile.role,
      isRealtorRole(profile.role)
        ? Number(profile.company_commission_percent)
        : null,
    ),
  );
  const hasUnassigned =
    input.clients.some((row) => !row.assigned_to) ||
    input.deals.some((row) => !row.assigned_to) ||
    input.tasks.some((row) => !row.assigned_to);
  if (hasUnassigned) {
    team.push(buildTeamRow("", "Без ответственного", null, null));
  }
  team.sort(
    (a, b) =>
      b.realtorEarnings - a.realtorEarnings ||
      b.grossVolume - a.grossVolume ||
      a.name.localeCompare(b.name, "ru"),
  );

  const upcomingDeals = currentPipeline
    .filter((deal) => timestamp(deal.expected_close_date) !== null)
    .sort(
      (a, b) =>
        (timestamp(a.expected_close_date) ?? Number.MAX_SAFE_INTEGER) -
        (timestamp(b.expected_close_date) ?? Number.MAX_SAFE_INTEGER),
    );

  return {
    periodStart,
    periodEnd,
    clientsCreated: periodClients.length,
    dealsCreated: periodDeals.length,
    tasksCreated: periodTasks.length,
    wonDeals: wonDeals.length,
    grossVolume: total(wonDeals, (deal) => deal.amount),
    realtorEarnings: total(wonDeals, realtorEarningsForDeal),
    conversionRate:
      closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : null,
    currentPipelineAmount: total(currentPipeline, (deal) => deal.amount),
    currentPipelineCount: currentPipeline.length,
    openTasks: openTasks.length,
    overdueTasks: urgentTasks.length,
    clientStatuses,
    dealStages,
    financialTrend,
    team,
    recentClients: [...periodClients]
      .sort(
        (a, b) =>
          (timestamp(b.created_at) ?? 0) - (timestamp(a.created_at) ?? 0),
      )
      .slice(0, 6),
    urgentTasks: urgentTasks.slice(0, 6),
    upcomingDeals: upcomingDeals.slice(0, 6),
  };
}
