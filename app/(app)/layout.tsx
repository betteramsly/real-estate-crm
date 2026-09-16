import * as React from "react";
import { cookies } from "next/headers";
import { AppChrome } from "@/components/app-chrome";
import { CreatedToast } from "@/components/created-toast";
import { requireProfile } from "@/lib/auth";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  const presentMode = isPresentCookie(cookies().get(PRESENT_COOKIE)?.value);

  return (
    <>
      <AppChrome
        role={profile.role}
        profile={profile}
        presentMode={presentMode}
      >
        {children}
      </AppChrome>
      <React.Suspense fallback={null}>
        <CreatedToast />
      </React.Suspense>
    </>
  );
}
