import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../property-form";
import { requireProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export default async function NewPropertyPage() {
  const { supabase, profile } = await requireProfile();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .returns<Profile[]>();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Объекты", href: "/properties" },
          { label: "Новый объект" },
        ]}
      />
      <PageHeader title="Новый объект" />
      <PropertyForm profiles={profiles ?? []} currentRole={profile.role} />
    </>
  );
}
