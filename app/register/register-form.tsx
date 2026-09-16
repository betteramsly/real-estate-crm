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
  full_name: z.string().min(2, "Минимум 2 символа"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
        },
      },
    });
    setIsLoading(false);

    if (error) {
      toast.error(error.message ?? "Не удалось зарегистрироваться");
      return;
    }

    toast.success("Аккаунт создан. Если требуется, подтвердите email.");
    router.push("/login");
  };

  return (
    <div className="brand-mesh flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/60 shadow-sm">
        <CardHeader className="space-y-3">
          <div className="space-y-3">
            <BrandLockup className="h-14" />
            <div>
              <CardTitle>Создать аккаунт</CardTitle>
              <CardDescription>Зарегистрируйтесь, чтобы начать работу</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">ФИО</Label>
              <Input
                id="full_name"
                placeholder="Иван Иванов"
                {...register("full_name")}
              />
              {errors.full_name ? (
                <p className="text-xs text-destructive">{errors.full_name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Зарегистрироваться
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Войти
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
