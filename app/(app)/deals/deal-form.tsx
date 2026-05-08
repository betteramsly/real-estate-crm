"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DEAL_STAGE_LABELS } from "@/lib/constants";
import {
  type DealFormState,
  createDealAction,
  updateDealAction,
} from "@/lib/actions/deals";
import type { Client, Deal, Profile, Property, UserRole } from "@/lib/types";

interface DealFormProps {
  deal?: Deal;
  clients: Pick<Client, "id" | "full_name">[];
  properties: Pick<Property, "id" | "title">[];
  profiles: Profile[];
  currentRole: UserRole;
  defaultClientId?: string;
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

export function DealForm({
  deal,
  clients,
  properties,
  profiles,
  currentRole,
  defaultClientId,
}: DealFormProps) {
  const router = useRouter();
  const action = deal ? updateDealAction.bind(null, deal.id) : createDealAction;
  const [state, formAction] = useFormState<DealFormState, FormData>(action, {});

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Название сделки *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={deal?.title ?? ""}
              required
            />
            {fe.title ? (
              <p className="text-xs text-destructive">{fe.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Клиент</Label>
            <Select
              name="client_id"
              defaultValue={deal?.client_id ?? defaultClientId ?? ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Объект</Label>
            <Select name="property_id" defaultValue={deal?.property_id ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Не указан" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Этап</Label>
            <Select name="stage" defaultValue={deal?.stage ?? "new"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEAL_STAGE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ответственный</Label>
            <Select
              name="assigned_to"
              defaultValue={deal?.assigned_to ?? ""}
              disabled={currentRole !== "admin" && Boolean(deal?.assigned_to)}
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

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма, ₽</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min="0"
              defaultValue={deal?.amount ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission">Комиссия, ₽</Label>
            <Input
              id="commission"
              name="commission"
              type="number"
              min="0"
              defaultValue={deal?.commission ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Ожидаемое закрытие</Label>
            <Input
              id="expected_close_date"
              name="expected_close_date"
              type="date"
              defaultValue={deal?.expected_close_date ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={deal?.notes ?? ""}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton label={deal ? "Сохранить" : "Создать сделку"} />
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
