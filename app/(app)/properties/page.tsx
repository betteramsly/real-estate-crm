import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PropertyCard } from "./property-card";
import { PropertiesFilters } from "./properties-filters";
import { requireProfile } from "@/lib/auth";
import type { Property } from "@/lib/types";

interface PageProps {
  searchParams: {
    q?: string;
    property_type?: string;
    listing_type?: string;
    status?: string;
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const { supabase } = await requireProfile();

  let query = supabase
    .from("properties")
    .select(
      "id, title, property_type, listing_type, status, price, area, rooms, address, city, district, description, cover_url, assigned_to, created_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (searchParams.property_type)
    query = query.eq("property_type", searchParams.property_type);
  if (searchParams.listing_type)
    query = query.eq("listing_type", searchParams.listing_type);
  if (searchParams.status) query = query.eq("status", searchParams.status);

  if (searchParams.q) {
    const q = `%${searchParams.q}%`;
    query = query.or(
      `title.ilike.${q},address.ilike.${q},city.ilike.${q},district.ilike.${q},description.ilike.${q}`,
    );
  }

  const { data: properties } = await query.returns<Property[]>();

  return (
    <>
      <PageHeader
        title="Объекты"
        description="Каталог объектов недвижимости агентства"
        actions={
          <Button asChild>
            <Link href="/properties/new">
              <Plus className="h-4 w-4" />
              Добавить объект
            </Link>
          </Button>
        }
      />

      <PropertiesFilters />

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="Объектов пока нет"
          description="Добавьте первый объект, чтобы он появился в каталоге."
          action={
            <Button asChild>
              <Link href="/properties/new">
                <Plus className="h-4 w-4" />
                Добавить объект
              </Link>
            </Button>
          }
        />
      )}
    </>
  );
}
