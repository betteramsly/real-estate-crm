import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "../property-form";
import { canManageProperties, requireProfile } from "@/lib/auth";
import { loadPropertyFormSuggestions } from "@/lib/property-form-suggestions";
import { redirect } from "next/navigation";

export default async function NewPropertyPage() {
  const { supabase, profile } = await requireProfile();
  if (!canManageProperties(profile.role)) redirect("/properties");
  const suggestions = await loadPropertyFormSuggestions(supabase);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "База ЖК", href: "/properties" },
          { label: "Новый объект" },
        ]}
      />
      <PageHeader title="Новый объект" />
      <PropertyForm suggestions={suggestions} />
    </>
  );
}
