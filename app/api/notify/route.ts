import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, title, message, link } = body;
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: { persistSession: false }
    });
    
    // Insert notification into public.notifications
    const { error: dbError } = await supabase.from("notifications").insert({
      user_id: userId || null,
      title,
      message,
      link: link || null
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
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "ProjectEdge Studio <info@projectedge.hu>",
            to: targetEmail,
            subject: title,
            html: `
              <div style="font-family: sans-serif; padding: 24px; color: #303841; max-width: 600px; margin: 0 auto; border: 1px solid rgba(0,0,0,0.06); border-radius: 16px;">
                <h2 style="color: #76ABAE; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 12px; margin-top: 0;">${title}</h2>
                <p style="font-size: 15px; line-height: 1.6;">${message}</p>
                ${link ? `
                  <p style="margin-top: 24px;">
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.projectedge.hu'}${link}" style="background-color: #76ABAE; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Megtekintés az Ügyfélkapun</a>
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
        emailLog = `Resend API Key missing. Simulated email to ${targetEmail}: [${title}] -> ${message}`;
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
