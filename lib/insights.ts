import type { Client, Deal, Task } from "@/lib/types";

export type InsightSeverity = "warning" | "info";

export interface InsightItem {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  href: string;
}

interface ComputeInsightsArgs {
  clients: Pick<Client, "id" | "full_name" | "status" | "updated_at">[];
  deals: Pick<
    Deal,
    "id" | "title" | "stage" | "updated_at" | "expected_close_date"
  >[];
  tasks: Pick<
    Task,
    "id" | "client_id" | "deal_id" | "status" | "due_at"
  >[];
  now?: Date;
}

const STALE_DEAL_DAYS = 7;
const STALE_CLIENT_DAYS = 14;

export function computeInsights({
  clients,
  deals,
  tasks,
  now = new Date(),
}: ComputeInsightsArgs): InsightItem[] {
  const insights: InsightItem[] = [];
  const today = now.getTime();

  const openTasksByClient = new Set<string>();
  const openTasksByDeal = new Set<string>();
  for (const task of tasks) {
    if (task.status === "todo" || task.status === "in_progress") {
      if (task.client_id) openTasksByClient.add(task.client_id);
      if (task.deal_id) openTasksByDeal.add(task.deal_id);
    }
  }

  // 1) Просроченные задачи
  const overdueTasks = tasks.filter((t) => {
    if (t.status !== "todo" && t.status !== "in_progress") return false;
    if (!t.due_at) return false;
    return new Date(t.due_at).getTime() < today;
  });
  if (overdueTasks.length > 0) {
    insights.push({
      id: "overdue-tasks",
      severity: "warning",
      title: `Просроченных задач: ${overdueTasks.length}`,
      description: "Закройте или перенесите дедлайны, чтобы вернуть контроль.",
      href: "/tasks?status=todo",
    });
  }

  // 2) Активные клиенты без открытых задач
  const orphanClients = clients.filter(
    (c) =>
      (c.status === "new" || c.status === "in_progress") &&
      !openTasksByClient.has(c.id),
  );
  if (orphanClients.length > 0) {
    insights.push({
      id: "clients-without-task",
      severity: "warning",
      title: `Клиентов без следующего шага: ${orphanClients.length}`,
      description:
        "Поставьте задачу: позвонить, отправить подборку или назначить показ.",
      href: "/clients?status=in_progress",
    });
  }

  // 3) Сделки без движения дольше 7 дней
  const staleDeals = deals.filter((d) => {
    if (d.stage === "closed_won" || d.stage === "closed_lost") return false;
    const updated = new Date(d.updated_at).getTime();
    const days = (today - updated) / (1000 * 60 * 60 * 24);
    return days >= STALE_DEAL_DAYS;
  });
  if (staleDeals.length > 0) {
    insights.push({
      id: "stale-deals",
      severity: "warning",
      title: `Сделок без движения ${STALE_DEAL_DAYS}+ дней: ${staleDeals.length}`,
      description:
        "Свяжитесь с клиентом или обновите этап, иначе сделка остынет.",
      href: "/deals",
    });
  }

  // 4) Сделки на финальной стадии без даты закрытия
  const contractWithoutDate = deals.filter(
    (d) =>
      (d.stage === "contract" || d.stage === "negotiation") &&
      !d.expected_close_date,
  );
  if (contractWithoutDate.length > 0) {
    insights.push({
      id: "deals-no-close-date",
      severity: "info",
      title: `Сделки без ожидаемой даты закрытия: ${contractWithoutDate.length}`,
      description:
        "Зафиксируйте дату — это влияет на прогноз и приоритеты команды.",
      href: "/deals",
    });
  }

  // 5) Долго не обновлявшиеся новые клиенты
  const coldClients = clients.filter((c) => {
    if (c.status !== "new") return false;
    const updated = new Date(c.updated_at).getTime();
    const days = (today - updated) / (1000 * 60 * 60 * 24);
    return days >= STALE_CLIENT_DAYS;
  });
  if (coldClients.length > 0) {
    insights.push({
      id: "cold-clients",
      severity: "info",
      title: `«Холодных» клиентов: ${coldClients.length}`,
      description: `Новых, к которым никто не возвращался ${STALE_CLIENT_DAYS}+ дней.`,
      href: "/clients?status=new",
    });
  }

  return insights;
}
