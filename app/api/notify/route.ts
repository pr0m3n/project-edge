import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// HTML-escape minden ügyfél/kliens által megadott szöveget, mielőtt az email
// sablonba kerül — így nem lehet HTML-t/scriptet injektálni a levélbe.
function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Csak belső, relatív útvonalat engedünk a levél gombjában (nyílt átirányítás ellen).
function safeInternalLink(link: unknown) {
  if (typeof link !== "string") return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }

    // 1. Hitelesítés: csak bejelentkezett felhasználó (ügyfél vagy admin) küldhet
    //    értesítést. Enélkül a végpont nyílt email-relay lenne.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, title, message, link } = body ?? {};

    // Egyszerű méret-korlátok, hogy ne lehessen a végponton keresztül óriási
    // tartalmat küldeni.
    const safeTitle = String(title ?? "").slice(0, 200);
    const safeMessage = String(message ?? "").slice(0, 4000);
    const safeLink = safeInternalLink(link);

    if (!safeTitle) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // Insert notification into public.notifications
    const { error: dbError } = await supabase.from("notifications").insert({
      user_id: userId || null,
      title: safeTitle,
      message: safeMessage,
      link: safeLink
    });

    if (dbError) {
      console.error("Failed to insert notification into DB:", dbError);
    }

    // Send email via Resend if API key is provided
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;
    let emailLog = "";

    // Determine recipient
    const targetEmail = email || (userId ? null : "admin@projectedge.hu");

    if (targetEmail) {
      if (resendApiKey) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu";
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "ProjectEdge Studio <info@projectedge.hu>",
            to: targetEmail,
            subject: safeTitle,
            html: `
              <div style="font-family: sans-serif; padding: 24px; color: #303841; max-width: 600px; margin: 0 auto; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px;">
                <h2 style="color: #76ABAE; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 12px; margin-top: 0;">${escapeHtml(safeTitle)}</h2>
                <p style="font-size: 15px; line-height: 1.6;">${escapeHtml(safeMessage)}</p>
                ${safeLink ? `
                  <p style="margin-top: 24px;">
                    <a href="${escapeHtml(siteUrl + safeLink)}" style="background-color: #76ABAE; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Megtekintés az Ügyfélkapun</a>
                  </p>
                ` : ""}
                <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 24px 0;" />
                <small style="color: rgba(48,56,65,0.5); display: block;">Ezt az értesítést a ProjectEdge automatikus rendszere küldte. Kérjük, ne válaszolj erre az emailre.</small>
              </div>
            `
          })
        });

        if (res.ok) {
          emailSent = true;
          emailLog = "Email sent via Resend API";
        } else {
          const errData = await res.json();
          emailLog = `Resend API failed: ${JSON.stringify(errData)}`;
        }
      } else {
        emailLog = `Resend API Key missing. Simulated email to ${targetEmail}: [${safeTitle}] -> ${safeMessage}`;
        console.log(emailLog);
      }
    } else {
      emailLog = "No target email provided, skipped sending email.";
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
