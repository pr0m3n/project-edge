import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

async function removeUserStorage(
  adminSupabase: SupabaseClient,
  userId: string,
  bucket: string
) {
  const paths: string[] = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const { data, error } = await adminSupabase.storage.from(bucket).list(userId, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) {
      if (/bucket.*not found/i.test(error.message)) return;
      throw new Error(`${bucket} tárhely listázása sikertelen: ${error.message}`);
    }
    const files = (data ?? []).filter((item) => item.id);
    paths.push(...files.map((item) => `${userId}/${item.name}`));
    if ((data?.length ?? 0) < pageSize) break;
    offset += pageSize;
  }

  if (paths.length) {
    const { error } = await adminSupabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(`${bucket} tárhely törlése sikertelen: ${error.message}`);
  }
}

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
    
    const [{ count: projectCount, error: projectError }, { count: ticketCount, error: ticketError }] = await Promise.all([
      adminSupabase.from("client_projects").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      adminSupabase.from("client_tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    ]);
    if (projectError || ticketError) {
      return NextResponse.json({ error: "A kapcsolódó üzleti adatok ellenőrzése nem sikerült." }, { status: 500 });
    }
    if ((projectCount ?? 0) > 0 || (ticketCount ?? 0) > 0) {
      return NextResponse.json({
        error: "A fiókhoz projekt vagy ügyfélszolgálati ügy tartozik, ezért önkiszolgáló módon nem törölhető. Kérd a lezárást az ügyfélszolgálattól."
      }, { status: 409 });
    }

    await removeUserStorage(adminSupabase, user.id, "client-assets");
    await removeUserStorage(adminSupabase, user.id, "client-logos");

    // Csak üres fiók törölhető; így nem vesznek el szerződéses és üzleti nyilvántartások.
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Account deletion failed", deleteError);
      return NextResponse.json({ error: "A fiók törlése most nem sikerült. Próbáld újra később." }, { status: 500 });
    }

    const notificationEmail = process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu";
    const notificationMessage = `Az ügyfél (${user.email ?? "ismeretlen email"}) véglegesen törölte a fiókját a rendszerből.`;
    const { error: notificationError } = await adminSupabase.from("notifications").insert({
      user_id: null,
      title: "Fiók törölve",
      message: notificationMessage,
      link: "/admin"
    });
    if (notificationError) {
      console.error("Account deletion notification insert failed", notificationError);
    }
    const emailResult = await sendProjectEdgeEmail({
      to: notificationEmail,
      subject: "Fiók törölve",
      message: notificationMessage,
      link: "/admin",
      eyebrow: "PROJECTEDGE · FIÓK TÖRLÉS",
      preheader: "Egy ügyfélfiók véglegesen törölve lett.",
      details: [{ label: "Email", value: user.email ?? "ismeretlen" }]
    });
    if (!emailResult.ok) {
      console.error("Account deletion notification email failed", emailResult.error);
    }
    
    return NextResponse.json({ success: true, message: "A fiók sikeresen és véglegesen törölve lett." });
  } catch (err: unknown) {
    // Részletek csak a szerverlogba: a tárhely- és sémainformáció nem való
    // a kliensnek.
    console.error("Account deletion route failed", err);
    return NextResponse.json({ error: "A fiók törlése most nem sikerült. Próbáld újra később." }, { status: 500 });
  }
}
