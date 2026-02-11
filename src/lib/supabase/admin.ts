import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!serviceRoleKey) {
        console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. Admin features may not work correctly as we are falling back to the Anon Key!");
        console.log("Current Env Vars Check - SUPABASE_SERVICE_ROLE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    } else {
        console.log("✅ SUPABASE_SERVICE_ROLE_KEY is loaded successfully.");
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey || anonKey!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}
