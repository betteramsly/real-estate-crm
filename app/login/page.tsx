import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход — MANTAEV CAPITAL агентство недвижимости",
  description: null,
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  return <LoginForm redirectTo={searchParams.redirectTo} error={searchParams.error} />;
}
