"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { BrandLoader } from "@/components/brand-loader";
import { BrandLockup } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  readSavedLoginEmail,
  writeSavedLoginEmail,
} from "@/lib/supabase/auth-cookies";
import { safeAppRedirect } from "@/lib/safe-redirect";

const schema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormValues = z.infer<typeof schema>;

function loginErrorMessage(error?: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  const code = error?.code ?? "";
  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(message)
  ) {
    return "Неверный логин или пароль";
  }
  return "Не удалось войти";
}

interface LoginFormProps {
  redirectTo?: string;
  error?: string;
}

export function LoginForm({ redirectTo, error }: LoginFormProps) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<"idle" | "checking" | "opening">(
    "idle",
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [remember, setRemember] = React.useState(true);
  const busy = phase !== "idle";

  React.useEffect(() => {
    setPhase("idle");
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPhase("idle");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
    const saved = readSavedLoginEmail();
    if (saved) setValue("email", saved, { shouldValidate: false });
  }, [setValue]);

  React.useEffect(() => {
    if (error) toast.error(decodeURIComponent(error));
  }, [error]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    setPhase("checking");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(values);

    if (authError) {
      setPhase("idle");
      const text = loginErrorMessage(authError);
      setFormError(text);
      toast.error(text);
      return;
    }

    writeSavedLoginEmail(remember ? values.email : "");
    await supabase.auth.getSession();

    setPhase("opening");
    router.push(safeAppRedirect(redirectTo));
    router.refresh();
  };

  return (
    <div className="brand-mesh flex min-h-screen items-center justify-center p-4">
      {busy ? (
        <BrandLoader
          label={phase === "opening" ? "Открываем кабинет" : "Входим"}
        />
      ) : null}
      <Card
        className={cn(
          "w-full max-w-md border-border/60 shadow-sm",
          busy && "hidden",
        )}
      >
        <CardHeader className="items-center text-center">
          <BrandLockup vertical className="mx-auto" />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="username"
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
            <button
              type="button"
              role="checkbox"
              aria-checked={remember}
              onClick={() => setRemember((value) => !value)}
              className="flex min-h-8 w-full items-center gap-2.5 text-left text-sm"
            >
              <span
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border transition-colors duration-200 ease-luxury",
                  remember
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/45 bg-transparent",
                )}
              >
                <Check
                  className={cn(
                    "h-3 w-3 transition-opacity duration-200 ease-luxury",
                    remember ? "opacity-100" : "opacity-0",
                  )}
                />
              </span>
              <span>Запомнить email на этом устройстве</span>
            </button>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={busy}>
              <Loader2
                className={cn(
                  "h-4 w-4 animate-spin",
                  !busy && "invisible",
                )}
              />
              Войти
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Кабинет останется открытым, пока не нажмёте «Выйти».
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
