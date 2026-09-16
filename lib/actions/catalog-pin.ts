"use server";

import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import type { PropertyInternal } from "@/lib/types";

const UNLOCK_COOKIE = "catalog_internal_ok";

export type UnlockInternalResult =
  | { internal: PropertyInternal }
  | { error: string };

function isUnlocked() {
  return cookies().get(UNLOCK_COOKIE)?.value === "1";
}

function setUnlocked(on: boolean) {
  cookies().set(UNLOCK_COOKIE, on ? "1" : "0", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: on ? 60 * 60 * 12 : 0,
  });
}

async function readInternal(propertyId: string): Promise<UnlockInternalResult> {
  const { supabase } = await requireProfile();
  const { data, error } = await supabase
    .from("properties")
    .select("internal")
    .eq("id", propertyId)
    .maybeSingle<{ internal: PropertyInternal | null }>();

  if (error || !data) {
    return { error: "Не удалось открыть служебный блок" };
  }

  return { internal: data.internal ?? {} };
}

export async function unlockPropertyInternal(
  propertyId: string,
  pin: string,
): Promise<UnlockInternalResult> {
  await requireProfile();
  const expected = process.env.CATALOG_INTERNAL_PIN ?? "12345";

  if (pin.trim() !== expected) {
    return { error: "Неверный код" };
  }

  const result = await readInternal(propertyId);
  if ("internal" in result) setUnlocked(true);
  return result;
}

export async function loadUnlockedInternal(
  propertyId: string,
): Promise<UnlockInternalResult | { locked: true }> {
  await requireProfile();
  if (!isUnlocked()) return { locked: true };
  return readInternal(propertyId);
}

export async function hideInternalBlock() {
  await requireProfile();
  setUnlocked(false);
}
