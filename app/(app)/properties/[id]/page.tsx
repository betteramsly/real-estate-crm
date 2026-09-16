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
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import type { Profile, Property } from "@/lib/types";

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await requireProfile();
  const presentMode = isPresentCookie(cookies().get(PRESENT_COOKIE)?.value);
  const canEdit = canManageProperties(profile.role) && !presentMode;

  const { data: property } = await supabase
    .from("properties")
    .select(presentMode ? PROPERTY_PUBLIC_COLUMNS : `${PROPERTY_PUBLIC_COLUMNS}, internal`)
    .eq("id", params.id)
    .maybeSingle<Property>();

  if (!property) notFound();

  const { data: profiles } = presentMode
    ? { data: [] as Profile[] }
    : await supabase.from("profiles").select("*").returns<Profile[]>();

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
            profiles={profiles ?? []}
            currentRole={profile.role}
            internal={property.internal}
          />
        </PropertyEditPanel>
      ) : null}
    </>
  );
}
