import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "MANTAEV CAPITAL агентство недвижимости",
  description: "MANTAEV CAPITAL агентство недвижимости",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const searchParams = await props.searchParams;
  return <LoginForm redirectTo={searchParams.redirectTo} error={searchParams.error} />;
}
