import "server-only";

import type { NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function now() {
  return Date.now();
}

export function getRequestIdentifier(request: Request | NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
}

/**
 * Best-effort per-instance protection for public endpoints. Production traffic
 * should still be backed by an edge/WAF limit, but this prevents accidental
 * abuse and covers single-instance/serverless bursts without a new database.
 */
export function checkRateLimit(
  request: Request | NextRequest,
  scope: string,
  limit: number,
  windowMs: number
) {
  const timestamp = now();
  if (buckets.size > 10_000) {
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= timestamp) buckets.delete(key);
    }
  }
  const key = `${scope}:${getRequestIdentifier(request)}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= timestamp) {
    buckets.set(key, { count: 1, resetAt: timestamp + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000))
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: "Túl sok kérés érkezett. Próbáld újra később." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store"
    }
  });
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
