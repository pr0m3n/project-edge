import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase/server";

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function authenticatedUser(request: Request): Promise<User | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}

/**
 * Admin-ellenőrzés a hívó SAJÁT tokenjével. Szándékosan nem a service role
 * kulccsal: az `admin_users` olvasását a `is_admin()` policy engedélyezi a
 * saját sorra, így a jogosultság forrása az adatbázis, nem a route kódja.
 */
export async function isAdminUser(request: Request, userId: string) {
  const token = bearerToken(request);
  if (!token) return false;
  const { data } = await createServerSupabaseUserClient(token)
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}
