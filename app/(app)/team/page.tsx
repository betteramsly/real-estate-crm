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
import { CommissionPercentField } from "./commission-percent-field";
import { TeamFeedbackInbox } from "./feedback-inbox";
import { RoleSelect } from "./role-select";
import { requireProfile } from "@/lib/auth";
import { formatDate, initials } from "@/lib/formatters";
import {
  canManageRealtorCommission,
  canViewCompanyAnalytics,
  canViewTeam,
  isRealtorRole,
  USER_ROLE_LABELS,
} from "@/lib/role-management";
import {
  PROPERTY_FEEDBACK_INBOX_ALL,
  PROPERTY_FEEDBACK_TEAM_COLUMNS,
  TEAM_FEEDBACK_UNDONE_STATUSES,
  teamMemberPath,
} from "@/lib/property-feedback";
import type { Profile, PropertyFeedbackWithRelations } from "@/lib/types";

export default async function TeamPage() {
  const { supabase, profile } = await requireProfile();
  if (!canViewTeam(profile.role, profile.is_owner)) redirect("/dashboard");

  const canAdministerTeam = profile.role === "admin";
  const canManageCommission = canManageRealtorCommission(
    profile.role,
    profile.is_owner,
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Profile[]>();

  let undoneRows: PropertyFeedbackWithRelations[] = [];
  let doneRows: PropertyFeedbackWithRelations[] = [];
  let openRows: Array<{ author_id: string }> = [];

  if (canAdministerTeam) {
    const [undoneResult, doneResult, openResult] = await Promise.all([
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
        .in("status", [...TEAM_FEEDBACK_UNDONE_STATUSES])
        .returns<Array<{ author_id: string }>>(),
    ]);

    undoneRows = undoneResult.data ?? [];
    doneRows = doneResult.data ?? [];
    openRows = openResult.data ?? [];
  }

  const openByAuthor = new Map<string, number>();
  for (const row of openRows) {
    const authorId = row.author_id;
    if (!authorId) continue;
    openByAuthor.set(authorId, (openByAuthor.get(authorId) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Команда"
        description={
          canAdministerTeam
            ? "Управляйте сотрудниками, ролями и обращениями команды"
            : "Установите долю компании с комиссии каждого риелтора"
        }
      />
      <div className="space-y-4">
        {canAdministerTeam ? (
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
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Сотрудники</CardTitle>
            {canManageCommission ? (
              <CardDescription>
                Процент компании удерживается из комиссии каждой успешно
                закрытой сделки риелтора.
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(profiles ?? []).map((p) => {
                const openCount = openByAuthor.get(p.id) ?? 0;
                const canChangeRole =
                  canAdministerTeam && p.id !== profile.id && !p.is_owner;
                const memberSummary = (
                  <>
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
                          <Badge className="rounded-full">{openCount}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[p.email, p.phone].filter(Boolean).join(" · ")}
                        {p.email || p.phone ? " · " : ""}
                        в системе с {formatDate(p.created_at)}
                      </p>
                    </div>
                  </>
                );
                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl border p-3 xl:flex-row xl:items-center xl:justify-between"
                  >
                    {canAdministerTeam ? (
                      <PrefetchLink
                        href={teamMemberPath(p.id)}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        {memberSummary}
                      </PrefetchLink>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {memberSummary}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                      {!canChangeRole ? (
                        <Badge
                          variant={
                            p.role === "admin"
                              ? "default"
                              : canViewCompanyAnalytics(p.role)
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {p.is_owner
                            ? "Разработчик"
                            : USER_ROLE_LABELS[p.role]}
                        </Badge>
                      ) : null}
                      {canManageCommission &&
                      isRealtorRole(p.role) &&
                      !p.is_owner ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Доля компании
                          </span>
                          <CommissionPercentField
                            userId={p.id}
                            initialValue={Number(
                              p.company_commission_percent ?? 0,
                            )}
                          />
                        </div>
                      ) : null}
                      {canChangeRole ? (
                        <RoleSelect
                          userId={p.id}
                          role={p.role}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        {canAdministerTeam ? (
          <TeamFeedbackInbox
            undoneCount={[...openByAuthor.values()].reduce(
              (sum, count) => sum + count,
              0,
            )}
            undoneItems={undoneRows}
            doneItems={doneRows}
          />
        ) : null}
      </div>
    </>
  );
}
