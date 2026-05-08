import { LoginForm } from "./login-form";

export const metadata = {
  title: "Вход — Real Estate CRM",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectTo?: string; error?: string };
}) {
  return <LoginForm redirectTo={searchParams.redirectTo} error={searchParams.error} />;
}
