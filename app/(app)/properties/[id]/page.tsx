import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ComplexHero } from "@/components/catalog/complex-hero";
import { ComplexSections } from "@/components/catalog/complex-sections";
import { PropertyForm } from "../property-form";
import { DeletePropertyButton } from "./delete-property-button";
import { requireProfile } from "@/lib/auth";
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

  const { data: property } = await supabase
    .from("properties")
    .select(PROPERTY_PUBLIC_COLUMNS)
    .eq("id", params.id)
    .maybeSingle<Property>();

  if (!property) notFound();

  const { data: profiles } = presentMode
    ? { data: [] as Profile[] }
    : await supabase.from("profiles").select("*").returns<Profile[]>();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "База ЖК", href: "/properties" },
            { label: property.title },
          ]}
        />
        {presentMode ? null : <DeletePropertyButton id={property.id} />}
      </div>

      <ComplexHero property={property} />
      <ComplexSections property={property} presentMode={presentMode} />

      {presentMode ? null : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Карточка</TabsTrigger>
            <TabsTrigger value="edit">Редактировать</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Клиентские блоки выше. Служебные цифры открываются только по
                коду. Редактирование — на соседней вкладке.
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
      )}
    </>
  );
}
