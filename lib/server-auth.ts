import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function authenticatedUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await createServerSupabaseClient().auth.getUser(token);
  return error ? null : data.user;
}
