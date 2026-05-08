import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ClientsTable } from "./clients-table";
import { ClientsFilters } from "./clients-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import type { Client, Profile } from "@/lib/types";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    source?: string;
    deal_type?: string;
  };
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const { supabase } = await requireProfile();

  let query = supabase
    .from("clients")
    .select(
      "id, full_name, phone, email, source, status, budget_min, budget_max, deal_type, notes, assigned_to, created_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.source) query = query.eq("source", searchParams.source);
  if (searchParams.deal_type)
    query = query.eq("deal_type", searchParams.deal_type);

  if (searchParams.q) {
    const q = `%${searchParams.q}%`;
    query = query.or(
      `full_name.ilike.${q},phone.ilike.${q},email.ilike.${q},notes.ilike.${q}`,
    );
  }

  const [{ data: clients }, { data: profiles }] = await Promise.all([
    query.returns<Client[]>(),
    supabase
      .from("profiles")
      .select("id, full_name, role, phone, avatar_url, created_at")
      .returns<Profile[]>(),
  ]);

  return (
    <>
      <PageHeader
        title="Клиенты"
        description="Все клиенты и их статусы в одном месте"
        actions={
          <Button asChild>
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              Добавить клиента
            </Link>
          </Button>
        }
      />

      <ClientsFilters />

      {clients && clients.length > 0 ? (
        <ClientsTable
          clients={clients}
          profiles={profiles ?? []}
        />
      ) : (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="Клиентов пока нет"
          description="Создайте первого клиента, чтобы начать работу."
          action={
            <Button asChild>
              <Link href="/clients/new">
                <Plus className="h-4 w-4" />
                Добавить клиента
              </Link>
            </Button>
          }
        />
      )}
    </>
  );
}
