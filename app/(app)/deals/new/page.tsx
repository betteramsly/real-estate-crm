import { PageHeader } from "@/components/page-header";
import { DealForm } from "../deal-form";
import { requireProfile } from "@/lib/auth";
import type { Client, Profile, Property } from "@/lib/types";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: { client_id?: string };
}) {
  const { supabase, profile } = await requireProfile();

  const [{ data: clients }, { data: properties }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name")
        .returns<Pick<Client, "id" | "full_name">[]>(),
      supabase
        .from("properties")
        .select("id, title")
        .returns<Pick<Property, "id" | "title">[]>(),
      supabase.from("profiles").select("*").returns<Profile[]>(),
    ]);

  return (
    <>
      <PageHeader title="Новая сделка" />
      <DealForm
        clients={clients ?? []}
        properties={properties ?? []}
        profiles={profiles ?? []}
        currentRole={profile.role}
        defaultClientId={searchParams.client_id}
      />
    </>
  );
}
