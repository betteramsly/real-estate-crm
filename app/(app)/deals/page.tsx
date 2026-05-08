import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DealsBoard } from "./deals-board";
import { requireProfile } from "@/lib/auth";
import type { Client, Deal, Profile, Property } from "@/lib/types";

export default async function DealsPage() {
  const { supabase } = await requireProfile();

  const [{ data: deals }, { data: clients }, { data: properties }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("deals")
        .select(
          "id, title, client_id, property_id, stage, amount, commission, expected_close_date, closed_at, notes, assigned_to, created_by, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .returns<Deal[]>(),
      supabase
        .from("clients")
        .select("id, full_name")
        .returns<Pick<Client, "id" | "full_name">[]>(),
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
        title="Сделки"
        description="Канбан-воронка: перетаскивайте сделки между этапами"
        actions={
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              Новая сделка
            </Link>
          </Button>
        }
      />

      <DealsBoard
        initialDeals={deals ?? []}
        clients={clients ?? []}
        properties={properties ?? []}
        profiles={profiles ?? []}
      />
    </>
  );
}
