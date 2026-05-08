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
import { PhoneInput } from "@/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  DEAL_TYPE_LABELS,
} from "@/lib/constants";
import {
  type ClientFormState,
  createClientAction,
  updateClientAction,
} from "@/lib/actions/clients";
import type { Client, Profile, UserRole } from "@/lib/types";

interface ClientFormProps {
  client?: Client;
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

export function ClientForm({ client, profiles, currentRole }: ClientFormProps) {
  const router = useRouter();
  const action = client
    ? updateClientAction.bind(null, client.id)
    : createClientAction;
  const [state, formAction] = useFormState<ClientFormState, FormData>(action, {});

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
    if (client && !state.error && state.fieldErrors === undefined) {
      // updateClientAction returns empty {} on success
    }
  }, [state, client]);

  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="full_name">ФИО клиента *</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={client?.full_name ?? ""}
              required
            />
            {fe.full_name ? (
              <p className="text-xs text-destructive">{fe.full_name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <PhoneInput
              id="phone"
              name="phone"
              defaultValue={client?.phone ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
            />
            {fe.email ? (
              <p className="text-xs text-destructive">{fe.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Источник</Label>
            <Select name="source" defaultValue={client?.source ?? "other"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_SOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select name="status" defaultValue={client?.status ?? "new"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Тип сделки</Label>
            <Select name="deal_type" defaultValue={client?.deal_type ?? "buy"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
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
              defaultValue={client?.assigned_to ?? ""}
              disabled={currentRole !== "admin" && Boolean(client?.assigned_to)}
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
            <Label htmlFor="budget_min">Бюджет от, ₽</Label>
            <Input
              id="budget_min"
              name="budget_min"
              type="number"
              min="0"
              defaultValue={client?.budget_min ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_max">Бюджет до, ₽</Label>
            <Input
              id="budget_max"
              name="budget_max"
              type="number"
              min="0"
              defaultValue={client?.budget_max ?? ""}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Заметки</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={client?.notes ?? ""}
              placeholder="Что важно знать про клиента"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SubmitButton label={client ? "Сохранить" : "Создать клиента"} />
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
      </div>
    </form>
  );
}
