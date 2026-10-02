import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ComplexHero } from "@/components/catalog/complex-hero";
import { ApartmentCalculator } from "@/components/catalog/apartment-calculator";
import { ComplexSections } from "@/components/catalog/complex-sections";
import { PresentPropertyBeacon } from "@/components/catalog/presentation-basket";
import { PropertyFeedbackButton } from "@/components/catalog/property-feedback-button";
import { PropertyForm } from "../property-form";
import { DeletePropertyButton } from "./delete-property-button";
import { PropertyEditPanel } from "./property-edit-panel";
import { CALCULATION_COLUMNS, mapCalculationRow } from "@/lib/apartment-quote";
import { canManageProperties, requireProfile } from "@/lib/auth";
import { PROPERTY_PUBLIC_COLUMNS } from "@/lib/catalog";
import { loadPropertyFormSuggestions } from "@/lib/property-form-suggestions";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import { canShowPropertyFeedback } from "@/lib/property-feedback";
import type { ApartmentCalculation, Property } from "@/lib/types";

export const unstable_dynamicStaleTime = 300;

async function PropertyEditor({ property }: { property: Property }) {
  const { supabase } = await requireProfile();
  const suggestions = await loadPropertyFormSuggestions(supabase);
  return (
    <PropertyEditPanel>
      <PropertyForm
        property={property}
        internal={property.internal}
        suggestions={suggestions}
      />
    </PropertyEditPanel>
  );
}

export default async function PropertyPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const { supabase, profile } = await requireProfile();
  const presentMode = isPresentCookie(
    (await cookies()).get(PRESENT_COOKIE)?.value,
  );
  const canEdit = canManageProperties(profile.role) && !presentMode;
  const showInternal = !presentMode;
  const showFeedback = canShowPropertyFeedback({ presentMode });
  const showMaterials = profile.role === "admin" && !presentMode;

  const { data: property } = await supabase
    .from("properties")
    .select(
      showInternal
        ? `${PROPERTY_PUBLIC_COLUMNS}, internal`
        : PROPERTY_PUBLIC_COLUMNS,
    )
    .eq("id", params.id)
    .maybeSingle<Property>();

  if (!property) notFound();

  const { data: calculationRows } = await supabase
    .from("apartment_calculations")
    .select(CALCULATION_COLUMNS)
    .eq("property_id", property.id)
    .eq("created_by", profile.id)
    .order("updated_at", { ascending: false })
    .limit(8);
  const calculations = (calculationRows ?? []).flatMap((row) => {
    const calculation = mapCalculationRow(row);
    return calculation ? [calculation] : [];
  }) satisfies ApartmentCalculation[];

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

      <ComplexHero
        property={property}
        hideRelevance={presentMode}
        overlay={
          showFeedback ? (
            <PropertyFeedbackButton propertyId={property.id} />
          ) : null
        }
      />
      <ComplexSections
        property={property}
        presentMode={presentMode}
        showMaterials={showMaterials}
        calculator={
          <ApartmentCalculator
            propertyId={property.id}
            propertyTitle={property.title}
            installmentMax={property.installment_max}
            installment={property.catalog?.installment}
            initialCalculations={calculations}
          />
        }
      />

      {canEdit ? (
        <Suspense fallback={null}>
          <PropertyEditor property={property} />
        </Suspense>
      ) : null}
    </>
  );
}
