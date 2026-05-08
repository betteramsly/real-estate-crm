import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { TasksList } from "./tasks-list";
import { TasksFilters } from "./tasks-filters";
import { TaskFormDialog } from "./task-form-dialog";
import { requireProfile } from "@/lib/auth";
import type { Client, Deal, Profile, Property, Task } from "@/lib/types";

interface PageProps {
  searchParams: {
    status?: string;
    priority?: string;
    scope?: string;
  };
}

export default async function TasksPage({ searchParams }: PageProps) {
  const { supabase, user } = await requireProfile();

  let query = supabase
    .from("tasks")
    .select(
      "id, title, description, status, priority, due_at, client_id, deal_id, property_id, assigned_to, created_by, created_at, updated_at",
    )
    .order("due_at", { ascending: true, nullsFirst: false });

  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.priority)
    query = query.eq("priority", searchParams.priority);
  if (searchParams.scope === "mine")
    query = query.eq("assigned_to", user.id);

  const [{ data: tasks }, { data: clients }, { data: deals }, { data: properties }, { data: profiles }] =
    await Promise.all([
      query.returns<Task[]>(),
      supabase
        .from("clients")
        .select("id, full_name")
        .returns<Pick<Client, "id" | "full_name">[]>(),
      supabase
        .from("deals")
        .select("id, title")
        .returns<Pick<Deal, "id" | "title">[]>(),
      supabase
        .from("properties")
        .select("id, title")
        .returns<Pick<Property, "id" | "title">[]>(),
      supabase
        .from("profiles")
        .select("id, full_name, role, phone, avatar_url, created_at")
        .returns<Profile[]>(),
    ]);

  return (
    <>
      <PageHeader
        title="Задачи"
        description="Список задач с дедлайнами и приоритетами"
        actions={
          <TaskFormDialog
            clients={clients ?? []}
            deals={deals ?? []}
            properties={properties ?? []}
            profiles={profiles ?? []}
            trigger={<Button>Новая задача</Button>}
          />
        }
      />

      <TasksFilters />

      {tasks && tasks.length > 0 ? (
        <TasksList
          tasks={tasks}
          clients={clients ?? []}
          deals={deals ?? []}
          properties={properties ?? []}
          profiles={profiles ?? []}
        />
      ) : (
        <EmptyState
          icon={<CheckSquare className="h-5 w-5" />}
          title="Задач пока нет"
          description="Создайте первую задачу — она появится здесь и на дашборде."
          action={
            <TaskFormDialog
              clients={clients ?? []}
              deals={deals ?? []}
              properties={properties ?? []}
              profiles={profiles ?? []}
              trigger={<Button>Новая задача</Button>}
            />
          }
        />
      )}
    </>
  );
}
