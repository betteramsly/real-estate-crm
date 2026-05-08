import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealForm } from "../deal-form";
import { DeleteDealButton } from "./delete-deal-button";
import { requireProfile } from "@/lib/auth";
import { DEAL_STAGE_COLORS, DEAL_STAGE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Client, Deal, Profile, Property } from "@/lib/types";

export default async function DealPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await requireProfile();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Deal>();

  if (!deal) notFound();

  const [{ data: clients }, { data: properties }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, full_name")
        .returns<Pick<Client, "id" | "full_name">[]>(),
      supabase
        .from("properties")
        .select("id, title")
        .returns<Pick<Property, "id" | "title">[]>(),
      supabase.from("profiles").select("*").returns<Profile[]>(),
    ]);

  const client = deal.client_id
    ? clients?.find((c) => c.id === deal.client_id)
    : null;
  const property = deal.property_id
    ? properties?.find((p) => p.id === deal.property_id)
    : null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/deals">
            <ArrowLeft className="h-4 w-4" />К сделкам
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                DEAL_STAGE_COLORS[deal.stage],
              )}
            />
            <Badge variant="secondary">{DEAL_STAGE_LABELS[deal.stage]}</Badge>
          </div>
          <h1 className="text-2xl font-semibold">{deal.title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {client ? (
              <PrefetchLink
                href={`/clients/${client.id}`}
                className="hover:underline"
              >
                {client.full_name}
              </PrefetchLink>
            ) : null}
            {property ? (
              <PrefetchLink
                href={`/properties/${property.id}`}
                className="hover:underline"
              >
                · {property.title}
              </PrefetchLink>
            ) : null}
          </div>
        </div>
        <DeleteDealButton id={deal.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Сумма
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(deal.amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Комиссия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(deal.commission)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Ожидаемое закрытие
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatDate(deal.expected_close_date)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {deal.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Заметки</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-line text-sm">
                {deal.notes}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Нет дополнительных заметок.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="edit">
          <DealForm
            deal={deal}
            clients={clients ?? []}
            properties={properties ?? []}
            profiles={profiles ?? []}
            currentRole={profile.role}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
