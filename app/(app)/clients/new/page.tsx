import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { ClientForm } from "../client-form";
import { requireProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function NewClientPage() {
  const { supabase, profile } = await requireProfile();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .returns<Profile[]>();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Клиенты", href: "/clients" },
          { label: "Новый клиент" },
        ]}
      />
      <PageHeader
        title="Новый клиент"
        description="Заполните основные данные клиента"
      />
      <ClientForm profiles={profiles ?? []} currentRole={profile.role} />
    </>
  );
}
