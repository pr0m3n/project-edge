import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import type { AdminUserActivity } from "@/components/admin/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Felhasználói áttekintő az adminnak.
 *
 * Miért kell hozzá SZERVER: az „mikor volt fent utoljára" (`last_sign_in_at`),
 * az e-mail megerősítés ténye és a belépési mód az `auth.users` táblában él,
 * amit a kliensoldali anon kulcs SOHA nem lát — csak a service role
 * `auth.admin` API-ja. A többi adat (projekt, ticket, módosítás, piszkozat)
 * a saját tábláinkból jön, és itt fűzzük össze, hogy az admin felület egyetlen
 * kérésből fel tudjon épülni.
 *
 * Jelszót, tokent és semmilyen titkot nem adunk vissza — csak azt, ami az
 * ügyfélkezeléshez tényleg kell.
 */

const USER_PAGE_SIZE = 200;
/** Ennyi felhasználóig lapozunk. Bőven a jelenlegi nagyságrend fölött van. */
const MAX_USER_PAGES = 25;

type Row = { user_id: string };

function newest(current: { at: string; label: string } | null, at: string | null | undefined, label: string) {
  if (!at) return current;
  if (!current || at > current.at) return { at, label };
  return current;
}

export async function GET(request: Request) {
  const rate = checkRateLimit(request, "admin-users", 30, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    if (!(await isAdminUser(request, user.id))) {
      return NextResponse.json({ error: "Nincs admin jogosultság." }, { status: 403 });
    }

    const admin = createServerSupabaseAdminClient();

    const authUsers: Array<{
      id: string;
      email?: string;
      created_at: string;
      last_sign_in_at?: string | null;
      email_confirmed_at?: string | null;
      app_metadata?: { providers?: string[]; provider?: string };
      user_metadata?: Record<string, unknown>;
    }> = [];
    for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE_SIZE });
      if (error) throw error;
      authUsers.push(...data.users);
      if (data.users.length < USER_PAGE_SIZE) break;
    }

    const [
      { data: profiles },
      { data: projects },
      { data: tickets },
      { data: changes },
      { data: drafts }
    ] = await Promise.all([
      admin.from("client_profiles").select("id,full_name,email"),
      admin.from("client_projects")
        .select("user_id,status,created_at,updated_at,commercial_model,subscription_status,monthly_price"),
      admin.from("client_tickets").select("user_id,status,last_message_at"),
      admin.from("change_requests").select("user_id,requested_at"),
      // A piszkozat-tábla csak a 035-ös migráció után létezik; a hiánya ne
      // döntse el az egész lekérdezést.
      admin.from("brief_drafts")
        .select("user_id,step,step_count,updated_at,reminder_sent_at,submitted_at")
        .is("submitted_at", null)
    ]);

    const profileByUser = new Map((profiles ?? []).map((row) => [row.id as string, row]));
    const draftByUser = new Map((drafts ?? []).map((row) => [(row as Row).user_id, row]));

    const users: AdminUserActivity[] = authUsers.map((account) => {
      const profile = profileByUser.get(account.id);
      const ownProjects = (projects ?? []).filter((row) => (row as Row).user_id === account.id);
      const ownTickets = (tickets ?? []).filter((row) => (row as Row).user_id === account.id);
      const ownChanges = (changes ?? []).filter((row) => (row as Row).user_id === account.id);
      const draft = draftByUser.get(account.id);

      let activity: { at: string; label: string } | null = null;
      activity = newest(activity, account.last_sign_in_at, "Belépett az ügyfélkapura");
      for (const project of ownProjects) {
        activity = newest(activity, project.created_at as string, "Projektindító adatlapot küldött be");
        activity = newest(activity, project.updated_at as string, "Változott a projektje állapota");
      }
      for (const ticket of ownTickets) {
        activity = newest(activity, ticket.last_message_at as string, "Üzenetet váltott a supporttal");
      }
      for (const change of ownChanges) {
        activity = newest(activity, change.requested_at as string, "Módosítást kért a weboldalán");
      }
      if (draft) {
        activity = newest(activity, draft.updated_at as string, "A projektindító adatlapot töltötte");
      }

      return {
        id: account.id,
        email: account.email ?? (profile?.email as string) ?? "",
        fullName: (profile?.full_name as string) ?? null,
        registeredAt: account.created_at,
        lastSignInAt: account.last_sign_in_at ?? null,
        emailConfirmedAt: account.email_confirmed_at ?? null,
        providers: account.app_metadata?.providers ?? (account.app_metadata?.provider ? [account.app_metadata.provider] : []),
        projectCount: ownProjects.length,
        activeProjectCount: ownProjects.filter((row) => !["closed", "cancelled"].includes(row.status as string)).length,
        ticketCount: ownTickets.length,
        openTicketCount: ownTickets.filter((row) => row.status !== "closed").length,
        changeRequestCount: ownChanges.length,
        monthlyRevenue: ownProjects
          .filter((row) => row.commercial_model === "subscription" && row.subscription_status === "active")
          .reduce((sum, row) => sum + Number(row.monthly_price ?? 0), 0),
        lastActivityAt: activity?.at ?? null,
        lastActivityLabel: activity?.label ?? null,
        draft: draft
          ? {
              step: Number(draft.step ?? 0),
              stepCount: Number(draft.step_count ?? 6),
              updatedAt: draft.updated_at as string,
              reminderSentAt: (draft.reminder_sent_at as string) ?? null
            }
          : null
      };
    });

    // Az az érdekes, aki mostanában mozgott — a régen látottak alulra kerülnek.
    users.sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));

    return NextResponse.json({ users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin user overview failed", error);
    return NextResponse.json({ error: "A felhasználói lista most nem tölthető be." }, { status: 500 });
  }
}
