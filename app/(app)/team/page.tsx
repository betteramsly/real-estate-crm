import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RoleSelect } from "./role-select";
import { requireProfile } from "@/lib/auth";
import { formatDate, initials } from "@/lib/formatters";
import type { Profile } from "@/lib/types";

export default async function TeamPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  return (
    <>
      <PageHeader
        title="Команда"
        description="Список сотрудников и их роли"
      />
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(profiles ?? []).map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{p.full_name ?? "Без имени"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.phone ?? ""} · в системе с {formatDate(p.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={p.role === "admin" ? "default" : "secondary"}
                  >
                    {p.role === "admin" ? "Админ" : "Агент"}
                  </Badge>
                  <RoleSelect userId={p.id} role={p.role} disabled={p.id === profile.id} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
