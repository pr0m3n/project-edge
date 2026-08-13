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

/**
 * A kérés törzsének beolvasása valódi felső mérethatárral.
 *
 * A `content-length` fejlécre nem lehet hagyatkozni: `Transfer-Encoding:
 * chunked` esetén nincs is jelen, és a kliens tetszőleges értéket írhat bele.
 * Itt a ténylegesen beérkező bájtokat számoljuk, és a limit átlépésekor
 * megszakítjuk az olvasást, tehát a memória sem terhelhető túl.
 */
export async function readLimitedBody(request: Request, maxBytes: number) {
  const body = request.body;
  if (!body) return { ok: true as const, text: "" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false as const, text: "" };
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true as const, text: new TextDecoder().decode(merged) };
}

export type JsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

/** Méretkorlátos JSON-body: 413 túl nagy törzsnél, 400 érvénytelen JSON-nál. */
export async function readJsonBody<T>(request: Request, maxBytes: number): Promise<JsonBodyResult<T>> {
  const body = await readLimitedBody(request, maxBytes);
  if (!body.ok) return { ok: false, response: jsonError("A kérés túl nagy.", 413) };
  if (!body.text.trim()) return { ok: false, response: jsonError("Hiányzó kérés törzs.", 400) };
  try {
    return { ok: true, data: JSON.parse(body.text) as T };
  } catch {
    return { ok: false, response: jsonError("Érvénytelen kérés törzs.", 400) };
  }
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
