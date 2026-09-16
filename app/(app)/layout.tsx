import * as React from "react";
import { cookies } from "next/headers";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
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
    <div className="flex min-h-screen bg-background">
      {presentMode ? null : <AppSidebar role={profile.role} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={profile} presentMode={presentMode} />
        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-8">
          <div className="mx-auto w-full min-w-0 max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>
      <React.Suspense fallback={null}>
        <CreatedToast />
      </React.Suspense>
    </div>
  );
}
