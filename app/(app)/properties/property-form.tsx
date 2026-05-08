"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/required-mark";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import {
  type PropertyFormState,
  createPropertyAction,
  updatePropertyAction,
} from "@/lib/actions/properties";
import type { Profile, Property, UserRole } from "@/lib/types";

interface PropertyFormProps {
  property?: Property;
  profiles: Profile[];
  currentRole: UserRole;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function PropertyForm({
  property,
  profiles,
  currentRole,
}: PropertyFormProps) {
  const router = useRouter();
  const action = property
    ? updatePropertyAction.bind(null, property.id)
    : createPropertyAction;
  const [state, formAction] = useFormState<PropertyFormState, FormData>(
    action,
    {},
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">
              Название <RequiredMark />
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={property?.title ?? ""}
              required
              placeholder="2-комн. в Сокольниках"
            />
            {fe.title ? (
              <p className="text-xs text-destructive">{fe.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Тип объекта</Label>
            <Select
              name="property_type"
              defaultValue={property?.property_type ?? "apartment"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип сделки</Label>
            <Select
              name="listing_type"
              defaultValue={property?.listing_type ?? "sale"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LISTING_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select name="status" defaultValue={property?.status ?? "active"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROPERTY_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">
              Цена, ₽ <RequiredMark />
            </Label>
            <AmountInput
              id="price"
              name="price"
              defaultValue={property?.price ?? ""}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="area">Площадь, м²</Label>
            <Input
              id="area"
              name="area"
              type="number"
              min="0"
              step="0.1"
              defaultValue={property?.area ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rooms">Комнат</Label>
            <Input
              id="rooms"
              name="rooms"
              type="number"
              min="0"
              defaultValue={property?.rooms ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              name="city"
              defaultValue={property?.city ?? ""}
              placeholder="Москва"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="district">Район</Label>
            <Input
              id="district"
              name="district"
              defaultValue={property?.district ?? ""}
              placeholder="Сокольники"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              name="address"
              defaultValue={property?.address ?? ""}
              placeholder="ул. Русаковская, 24"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cover_url">URL обложки</Label>
            <Input
              id="cover_url"
              name="cover_url"
              type="url"
              defaultValue={property?.cover_url ?? ""}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Ответственный</Label>
            <Select
              name="assigned_to"
              defaultValue={property?.assigned_to ?? ""}
              disabled={
                currentRole !== "admin" && Boolean(property?.assigned_to)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите агента" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? "—"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={property?.description ?? ""}
              placeholder="Особенности объекта, ремонт, инфраструктура и т.д."
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton label={property ? "Сохранить" : "Создать объект"} />
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
