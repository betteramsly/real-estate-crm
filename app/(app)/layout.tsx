import * as React from "react";
import { cookies } from "next/headers";
import { AppChrome } from "@/components/app-chrome";
import { CreatedToast } from "@/components/created-toast";
import { requireProfile } from "@/lib/auth";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import { TEAM_FEEDBACK_UNDONE_STATUSES } from "@/lib/property-feedback";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await requireProfile();
  const presentMode = isPresentCookie(
    (await cookies()).get(PRESENT_COOKIE)?.value,
  );
  let teamOpenCount = 0;
  if (profile.role === "admin" && !presentMode) {
    const { count } = await supabase
      .from("property_feedback")
      .select("id", { count: "exact", head: true })
      .in("status", [...TEAM_FEEDBACK_UNDONE_STATUSES]);
    teamOpenCount = count ?? 0;
  }

  return (
    <>
      <AppChrome
        role={profile.role}
        profile={profile}
        presentMode={presentMode}
        teamOpenCount={teamOpenCount}
      >
        {children}
      </AppChrome>
      <React.Suspense fallback={null}>
        <CreatedToast />
      </React.Suspense>
    </>
  );
}
