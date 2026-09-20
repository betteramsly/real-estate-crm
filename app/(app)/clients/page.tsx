import { Plus, Users } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { ClientsTable } from "./clients-table";
import { ClientsFilters } from "./clients-filters";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import { normalizeSearchTerm } from "@/lib/search";
import type { Client, Profile } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
    source?: string;
    deal_type?: string;
  }>;
}

export default async function ClientsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireProfile();

  let query = supabase
    .from("clients")
    .select(
      "id, full_name, phone, email, source, status, budget_min, budget_max, deal_type, notes, assigned_to, created_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (
    ["new", "in_progress", "won", "lost"].includes(
      searchParams.status ?? "",
    )
  ) {
    query = query.eq("status", searchParams.status!);
  }
  if (
    ["referral", "cian", "avito", "instagram", "other"].includes(
      searchParams.source ?? "",
    )
  ) {
    query = query.eq("source", searchParams.source!);
  }
  if (
    ["buy", "sell", "rent_in", "rent_out"].includes(
      searchParams.deal_type ?? "",
    )
  )
    query = query.eq("deal_type", searchParams.deal_type);

  const search = normalizeSearchTerm(searchParams.q);
  if (search) {
    const q = `%${search}%`;
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
          <PrefetchLink href="/clients/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Добавить клиента
          </PrefetchLink>
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
            <PrefetchLink href="/clients/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              Добавить клиента
            </PrefetchLink>
          }
        />
      )}
    </>
  );
}
