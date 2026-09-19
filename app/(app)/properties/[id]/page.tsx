import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ComplexHero } from "@/components/catalog/complex-hero";
import { ComplexSections } from "@/components/catalog/complex-sections";
import { PresentPropertyBeacon } from "@/components/catalog/presentation-basket";
import { PropertyForm } from "../property-form";
import { DeletePropertyButton } from "./delete-property-button";
import { PropertyEditPanel } from "./property-edit-panel";
import { canManageProperties, requireProfile } from "@/lib/auth";
import { PROPERTY_PUBLIC_COLUMNS } from "@/lib/catalog";
import { loadPropertyFormSuggestions } from "@/lib/property-form-suggestions";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import type { Property } from "@/lib/types";

export default async function PropertyPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { supabase, profile } = await requireProfile();
  const presentMode = isPresentCookie(
    (await cookies()).get(PRESENT_COOKIE)?.value,
  );
  const canEdit = canManageProperties(profile.role) && !presentMode;

  const [{ data: property }, suggestions] = await Promise.all([
    supabase
      .from("properties")
      .select(
        canEdit
          ? `${PROPERTY_PUBLIC_COLUMNS}, internal`
          : PROPERTY_PUBLIC_COLUMNS,
      )
      .eq("id", params.id)
      .maybeSingle<Property>(),
    canEdit
      ? loadPropertyFormSuggestions(supabase)
      : Promise.resolve(undefined),
  ]);

  if (!property) notFound();

  return (
    <>
      <PresentPropertyBeacon
        presentMode={presentMode}
        property={{
          id: property.id,
          title: property.title,
          developer: property.developer,
          cover_url: property.cover_url,
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: presentMode ? "Каталог" : "База ЖК", href: "/properties" },
            { label: property.title },
          ]}
        />
        {canEdit ? <DeletePropertyButton id={property.id} /> : null}
      </div>

      <ComplexHero property={property} hideRelevance={presentMode} />
      <ComplexSections property={property} presentMode={presentMode} />

      {canEdit ? (
        <PropertyEditPanel>
          <PropertyForm
            property={property}
            internal={property.internal}
            suggestions={suggestions}
          />
        </PropertyEditPanel>
      ) : null}
    </>
  );
}
