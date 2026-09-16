import Link from "next/link";
import { BrandLockup } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Регистрация — MANTAEV CAPITAL",
};

export default function RegisterPage() {
  return (
    <div className="brand-mesh flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="space-y-3">
            <BrandLockup className="h-14" />
            <div>
              <CardTitle>Регистрация закрыта</CardTitle>
              <CardDescription>
                Аккаунт агента создаёт администратор и передаёт email с паролем.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Войти</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
