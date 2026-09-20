import { redirect } from "next/navigation";
import { PrefetchLink } from "@/components/prefetch-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { AddAgentForm } from "./add-agent-form";
import { TeamFeedbackInbox } from "./feedback-inbox";
import { RoleSelect } from "./role-select";
import { requireProfile } from "@/lib/auth";
import { formatDate, initials } from "@/lib/formatters";
import {
  PROPERTY_FEEDBACK_INBOX_ALL,
  PROPERTY_FEEDBACK_TEAM_COLUMNS,
  TEAM_FEEDBACK_UNDONE_STATUSES,
  teamMemberPath,
} from "@/lib/property-feedback";
import type { Profile, PropertyFeedbackWithRelations } from "@/lib/types";

export default async function TeamPage() {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");

  const [{ data: profiles }, { data: undoneRows }, { data: doneRows }, { data: openRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<Profile[]>(),
      supabase
        .from("property_feedback")
        .select(PROPERTY_FEEDBACK_TEAM_COLUMNS)
        .in("status", [...TEAM_FEEDBACK_UNDONE_STATUSES])
        .order("created_at", { ascending: false })
        .limit(PROPERTY_FEEDBACK_INBOX_ALL)
        .returns<PropertyFeedbackWithRelations[]>(),
      supabase
        .from("property_feedback")
        .select(PROPERTY_FEEDBACK_TEAM_COLUMNS)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(PROPERTY_FEEDBACK_INBOX_ALL)
        .returns<PropertyFeedbackWithRelations[]>(),
      supabase
        .from("property_feedback")
        .select("author_id")
        .in("status", [...TEAM_FEEDBACK_UNDONE_STATUSES]),
    ]);

  const openByAuthor = new Map<string, number>();
  for (const row of openRows ?? []) {
    const authorId =
      row && typeof row === "object" && "author_id" in row
        ? String((row as { author_id: string }).author_id)
        : "";
    if (!authorId) continue;
    openByAuthor.set(authorId, (openByAuthor.get(authorId) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Команда"
        description="Создайте агента и отдайте ему email с паролем для входа"
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Новый агент</CardTitle>
            <CardDescription>
              Аккаунт сразу активен. Агент не сможет менять базу ЖК — только
              смотреть, показывать и делиться подборкой.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddAgentForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Сотрудники</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(profiles ?? []).map((p) => {
                const openCount = openByAuthor.get(p.id) ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <PrefetchLink
                      href={teamMemberPath(p.id)}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <Avatar>
                        {p.avatar_url ? (
                          <AvatarImage
                            src={p.avatar_url}
                            alt={p.full_name ?? "Аватар"}
                          />
                        ) : null}
                        <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {p.full_name ?? "Без имени"}
                          </p>
                          {openCount ? (
                            <Badge className="rounded-full">
                              {openCount}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {[p.email, p.phone].filter(Boolean).join(" · ")}
                          {p.email || p.phone ? " · " : ""}
                          в системе с {formatDate(p.created_at)}
                        </p>
                      </div>
                    </PrefetchLink>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={p.role === "admin" ? "default" : "secondary"}
                      >
                        {p.role === "admin" ? "Админ" : "Агент"}
                      </Badge>
                      <RoleSelect
                        userId={p.id}
                        role={p.role}
                        disabled={p.id === profile.id}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <TeamFeedbackInbox
          undoneCount={[...openByAuthor.values()].reduce(
            (sum, count) => sum + count,
            0,
          )}
          undoneItems={undoneRows ?? []}
          doneItems={doneRows ?? []}
        />
      </div>
    </>
  );
}
