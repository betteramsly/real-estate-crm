import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}

export async function requireProfile() {
  const { user, supabase } = await requireUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, avatar_url, created_at")
    .eq("id", user.id)
    .single<Profile>();

  if (error || !profile) {
    redirect("/login?error=" + encodeURIComponent("Профиль не найден"));
  }

  return { user, supabase, profile };
}
