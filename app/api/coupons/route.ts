import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

type CouponRequest = {
  code?: unknown;
  projectId?: unknown;
};

function couponError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error
    ? String(error.message)
    : "A kupon most nem alkalmazható.";

  if (/már felhasználta/i.test(message)) return { message, status: 409 };
  if (/nem található/i.test(message)) return { message, status: 404 };
  if (/érvénytelen|lejárt|csak|előtt|nincs végleges/i.test(message)) return { message, status: 409 };
  return { message: "A kupon most nem alkalmazható. Próbáld újra később.", status: 500 };
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "coupon-apply", 12, 10 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "A munkamenet lejárt. Jelentkezz be újra." }, { status: 401 });

  const parsed = await readJsonBody<CouponRequest>(request, 2_000);
  if (!parsed.ok) return parsed.response;

  const projectId = typeof parsed.data.projectId === "string" ? parsed.data.projectId : "";
  const code = typeof parsed.data.code === "string" ? parsed.data.code.trim().toUpperCase() : "";
  if (!isUuid(projectId) || !/^[A-Z0-9-]{4,32}$/.test(code)) {
    return NextResponse.json({ error: "Írj be egy érvényes kuponkódot." }, { status: 400 });
  }

  const { data, error } = await createServerSupabaseAdminClient().rpc("apply_project_coupon_admin", {
    target_project_id: projectId,
    target_user_id: user.id,
    requested_code: code
  });

  if (error) {
    const response = couponError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }

  return NextResponse.json({ coupon: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const rate = checkRateLimit(request, "coupon-remove", 12, 10 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: "A munkamenet lejárt. Jelentkezz be újra." }, { status: 401 });

  const parsed = await readJsonBody<CouponRequest>(request, 1_000);
  if (!parsed.ok) return parsed.response;
  const projectId = typeof parsed.data.projectId === "string" ? parsed.data.projectId : "";
  if (!isUuid(projectId)) {
    return NextResponse.json({ error: "Érvénytelen projektazonosító." }, { status: 400 });
  }

  const { data, error } = await createServerSupabaseAdminClient().rpc("remove_project_coupon_admin", {
    target_project_id: projectId,
    target_user_id: user.id
  });

  if (error) {
    const response = couponError(error);
    return NextResponse.json({ error: response.message }, { status: response.status });
  }

  return NextResponse.json({ coupon: data }, { headers: { "Cache-Control": "no-store" } });
}
