import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANTS,
  DEAL_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatRelative, initials } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Client, Profile } from "@/lib/types";

interface ClientsTableProps {
  clients: Client[];
  profiles: Profile[];
}

export function ClientsTable({ clients, profiles }: ClientsTableProps) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Клиент</TableHead>
            <TableHead>Контакты</TableHead>
            <TableHead>Тип</TableHead>
            <TableHead>Бюджет</TableHead>
            <TableHead>Источник</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Ответственный</TableHead>
            <TableHead>Создан</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => {
            const assignee = client.assigned_to
              ? profileById.get(client.assigned_to)
              : null;
            return (
              <TableRow key={client.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {initials(client.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{client.full_name}</p>
                      {client.notes ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {client.notes}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{client.phone ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {client.email ?? ""}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {DEAL_TYPE_LABELS[client.deal_type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {client.budget_min || client.budget_max ? (
                    <span className="whitespace-nowrap text-sm">
                      {formatCurrency(client.budget_min)} —{" "}
                      {formatCurrency(client.budget_max)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {CLIENT_SOURCE_LABELS[client.source]}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                      CLIENT_STATUS_VARIANTS[client.status],
                    )}
                  >
                    {CLIENT_STATUS_LABELS[client.status]}
                  </span>
                </TableCell>
                <TableCell>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {initials(assignee.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {assignee.full_name ?? "—"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatRelative(client.created_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
