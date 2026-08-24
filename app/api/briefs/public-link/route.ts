import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, rateLimitResponse } from "@/lib/api-guard";

/**
 * A folytatás-link VISSZAOLVASÁSA.
 *
 * A kiküldő ág (POST) megszűnt: a záró képernyőről kikerült a „küldd el
 * magadnak emailben" kimenet. Ez az útvonal viszont szándékosan életben marad,
 * mert a KORÁBBAN kiküldött levelekben lévő `?brief=<id>~<token>` linkek még
 * mindig ide érkeznek — törlésével azok némán meghalnának.
 */

function clean(value: unknown, limit = 400) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

/** A folytatás-link visszaolvasása: `?id=<uuid>&token=<uuid>`. */
export async function GET(request: Request) {
  const rate = await checkDurableRateLimit(request, "public-brief-resume", 30, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"), 64);
  const token = clean(url.searchParams.get("token"), 64);
  if (!id || !token) {
    return NextResponse.json({ error: "Hiányzó azonosító." }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseAdminClient();
    const { data, error } = await supabase
      .from("public_brief_leads")
      .select("data, step")
      .eq("id", id)
      .eq("resume_token", token)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "A link érvénytelen vagy lejárt." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, form: data.data, step: data.step });
  } catch (cause) {
    console.error("Public brief resume failed", cause);
    return NextResponse.json({ error: "A link most nem ellenőrizhető. Próbáld újra később." }, { status: 503 });
  }
}
