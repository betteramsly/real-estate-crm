import { notFound } from "next/navigation";
import Image from "next/image";
import { Bed, MapPin, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyForm } from "../property-form";
import { DeletePropertyButton } from "./delete-property-button";
import { requireProfile } from "@/lib/auth";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_VARIANTS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Profile, Property } from "@/lib/types";

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await requireProfile();

  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Property>();

  if (!property) notFound();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .returns<Profile[]>();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Объекты", href: "/properties" },
          { label: property.title },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border bg-muted">
            {property.cover_url ? (
              <Image
                src={property.cover_url}
                alt={property.title}
                fill
                sizes="(min-width: 1024px) 66vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                нет фото
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {PROPERTY_TYPE_LABELS[property.property_type]}
            </Badge>
            <Badge variant="outline">
              {LISTING_TYPE_LABELS[property.listing_type]}
            </Badge>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                PROPERTY_STATUS_VARIANTS[property.status],
              )}
            >
              {PROPERTY_STATUS_LABELS[property.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              · обновлено {formatRelative(property.updated_at)}
            </span>
          </div>

          <h1 className="text-2xl font-semibold">{property.title}</h1>
          <p className="text-2xl font-bold">
            {formatCurrency(property.price)}
            {property.listing_type === "rent" ? (
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                /мес
              </span>
            ) : null}
          </p>

          {property.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Описание</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm">
                {property.description}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Характеристики</CardTitle>
            <DeletePropertyButton id={property.id} />
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {property.area ? (
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Ruler className="h-4 w-4" /> Площадь
                </span>
                <span>{property.area} м²</span>
              </div>
            ) : null}
            {property.rooms ? (
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <Bed className="h-4 w-4" /> Комнат
                </span>
                <span>{property.rooms}</span>
              </div>
            ) : null}
            {property.address || property.city ? (
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> Адрес
                </span>
                <span className="text-right">
                  {[property.city, property.district, property.address]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Используйте вкладку «Редактировать», чтобы изменить параметры
              объекта.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <PropertyForm
            property={property}
            profiles={profiles ?? []}
            currentRole={profile.role}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
