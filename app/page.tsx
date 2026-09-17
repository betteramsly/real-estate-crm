import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { APP_HOME } from "@/lib/safe-redirect";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(APP_HOME);
  }

  redirect("/login");
}
