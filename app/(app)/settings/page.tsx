import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "./profile-form";
import { requireProfile } from "@/lib/auth";

export default async function SettingsPage() {
  const { profile, user } = await requireProfile();

  return (
    <>
      <PageHeader title="Настройки" description="Профиль и данные аккаунта" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} email={user.email ?? ""} />
        </CardContent>
      </Card>
    </>
  );
}
