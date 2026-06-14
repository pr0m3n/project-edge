import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Hiányzó hitelesítő token." }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return NextResponse.json({ error: "Szerver oldali Supabase konfigurációs hiba." }, { status: 500 });
    }
    
    // 1. Verify user identity using their token
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    
    const { data: { user }, error: authError } = await clientSupabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    }
    
    // 2. Delete the user using the admin/service role client
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });
    
    // Delete auth user (cascades to public.client_profiles, projects, tickets etc. due to ON DELETE CASCADE)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json({ error: `Fiók törlése sikertelen: ${deleteError.message}` }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: "A fiók sikeresen és véglegesen törölve lett." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
