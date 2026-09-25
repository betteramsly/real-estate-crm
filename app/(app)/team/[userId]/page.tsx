import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { TeamMemberFeedbackList } from "./feedback-list";
import { requireProfile } from "@/lib/auth";
import { formatDate, initials } from "@/lib/formatters";
import {
  isPropertyFeedbackId,
  PROPERTY_FEEDBACK_TEAM_COLUMNS,
} from "@/lib/property-feedback";
import type { Profile, PropertyFeedbackWithRelations } from "@/lib/types";

export default async function TeamMemberPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  if (!isPropertyFeedbackId(userId)) notFound();

  const { data: member } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_owner, phone, email, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle<Profile>();

  if (!member) notFound();

  const { data: items } = await supabase
    .from("property_feedback")
    .select(PROPERTY_FEEDBACK_TEAM_COLUMNS)
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .returns<PropertyFeedbackWithRelations[]>();
  const notes = items ?? [];
  const undoneItems = notes.filter((item) => item.status !== "done");
  const doneItems = notes.filter((item) => item.status === "done");

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Команда", href: "/team" },
          { label: member.full_name ?? "Сотрудник" },
        ]}
      />
      <PageHeader
        title={member.full_name ?? "Без имени"}
        description={[member.email, member.phone]
          .filter(Boolean)
          .concat(`в системе с ${formatDate(member.created_at)}`)
          .join(" · ")}
      />

      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          {member.avatar_url ? (
            <AvatarImage
              src={member.avatar_url}
              alt={member.full_name ?? "Аватар"}
            />
          ) : null}
          <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
        </Avatar>
        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
          {member.is_owner
            ? "Разработчик"
            : member.role === "admin"
              ? "Админ"
              : "Агент"}
        </Badge>
      </div>

      <TeamMemberFeedbackList
        undoneItems={undoneItems}
        doneItems={doneItems}
      />
    </>
  );
}
