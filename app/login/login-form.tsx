"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormValues = z.infer<typeof schema>;

interface LoginFormProps {
  redirectTo?: string;
  error?: string;
}

export function LoginForm({ redirectTo, error }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  React.useEffect(() => {
    if (error) toast.error(decodeURIComponent(error));
  }, [error]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(values);
    setIsLoading(false);

    if (authError) {
      toast.error(authError.message ?? "Не удалось войти");
      return;
    }

    toast.success("Вход выполнен");
    router.push(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
    router.refresh();
  };

  const fillDemo = (kind: "admin" | "agent") => {
    setValue(
      "email",
      kind === "admin" ? "admin@demo.local" : "agent@demo.local",
    );
    setValue("password", "demo1234");
  };

  return (
    <div className="brand-mesh flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="space-y-3">
            <BrandLockup className="h-14" />
            <div>
              <CardTitle>Вход в кабинет</CardTitle>
              <CardDescription>Войдите в аккаунт, чтобы продолжить</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Войти
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-xs text-muted-foreground">Demo-аккаунты:</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => fillDemo("admin")}
              >
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => fillDemo("agent")}
              >
                Agent
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Нет аккаунта?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Регистрация
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
