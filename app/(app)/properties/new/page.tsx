import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../property-form";
import { canManageProperties, requireProfile } from "@/lib/auth";
import type { Profile } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function NewPropertyPage() {
  const { supabase, profile } = await requireProfile();
  if (!canManageProperties(profile.role)) redirect("/properties");
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .returns<Profile[]>();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "База ЖК", href: "/properties" },
          { label: "Новый объект" },
        ]}
      />
      <PageHeader title="Новый объект" />
      <PropertyForm profiles={profiles ?? []} currentRole={profile.role} />
    </>
  );
}
