import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход — MANTAEV CAPITAL агентство недвижимости",
  description: null,
};

export default async function LoginPage(props: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <LoginForm redirectTo={searchParams.redirectTo} error={searchParams.error} />;
}
