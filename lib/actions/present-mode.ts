"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PRESENT_COOKIE } from "@/lib/present-mode";

export async function setPresentModeAction(on: boolean) {
  const store = await cookies();
  store.set(PRESENT_COOKIE, on ? "1" : "0", {
    path: "/",
    maxAge: on ? 60 * 60 * 12 : 0,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  revalidatePath("/", "layout");
}
