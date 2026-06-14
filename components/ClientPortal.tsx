"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Project = {
  id: string;
  contact_email: string | null;
  contact_name: string | null;
  title: string;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  next_step: string | null;
  created_at: string;
  offer_title: string | null;
  offer_summary: string | null;
  offer_scope: string | null;
  offer_timeline: string | null;
  offer_deliverables: string | null;
  offer_price: number | null;
  offer_currency: string | null;
  offer_note: string | null;
  offer_status: string | null;
  offer_sent_at: string | null;
  client_decision_note: string | null;
};

type Ticket = {
  id: string;
  project_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  subject: string;
  status: string;
  rating: number | null;
  rating_comment: string | null;
  last_message_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender: "customer" | "admin";
  body: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  request_received: "Igény beérkezett",
  planning: "Tervezés",
  offer_sent: "Ajánlat elküldve",
  in_progress: "Kivitelezés",
  review: "Átnézés",
  launched: "Élesítve",
  paused: "Szünetel",
  closed: "Lezárva",
  open: "Nyitott",
  answered: "Megválaszolva"
};

const initialProject = {
  audience: "",
  budget: "not-sure",
  company: "",
  features: "",
  goals: "",
  pages: "",
  palette: "edge",
  projectType: "premium-business-site",
  priority: "quality",
  style: "",
  title: "",
  vibe: "premium",
  website: ""
};

const initialTicket = {
  body: "",
  projectId: "",
  subject: ""
};

const projectFlow = [
  ["request_received", "Brief"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["in_progress", "Építés"],
  ["review", "Átnézés"],
  ["launched", "Élesítés"]
];

const briefSteps = [
  "Alapok",
  "Vágyott eredmény",
  "Oldalak és funkciók",
  "Vizuális irány",
  "Összegzés"
];

const projectTypeOptions: Array<[string, string, string]> = [
  ["premium-business-site", "Prémium céges weboldal", "Bemutatkozás, bizalomépítés, ajánlatkérés."],
  ["redesign", "Meglévő oldal fejlesztése", "Van már alap, de jobb szerkezet és design kell."],
  ["web-app", "Webapp / admin rendszer", "Belépés, adatkezelés, dashboard, folyamatok."],
  ["client-portal", "Ügyfélkapu / dashboard", "Privát ügyfélfelület, státuszok, ticketek."],
  ["care-plan", "Karbantartás és növekedés", "Folyamatos javítás, mérés, fejlesztés."]
];

const vibeOptions: Array<[string, string, string]> = [
  ["premium", "Prémium", "Nagy kontraszt, erős első benyomás, drágább érzet."],
  ["clean", "Letisztult", "Sok levegő, egyszerű döntések, gyors megértés."],
  ["bold", "Merész", "Nagy tipó, karakteres blokkok, emlékezetes oldal."],
  ["friendly", "Barátságos", "Közvetlenebb hang, puhább ritmus, könnyű kapcsolatfelvétel."]
];

const paletteOptions: Array<[string, string, string[]]> = [
  ["edge", "ProjectEdge", ["#F5F5F5", "#76ABAE", "#303841", "#FF5722"]],
  ["mono", "Monokróm tech", ["#F7F7F2", "#D9E2DF", "#20242A", "#111111"]],
  ["warm", "Meleg prémium", ["#FFF7EF", "#E8C6A4", "#32302F", "#E6532E"]],
  ["fresh", "Friss SaaS", ["#F7FBF9", "#92D1C3", "#29353D", "#2F8F83"]],
  ["luxury", "Luxus sötét", ["#F4EFE7", "#C6A15B", "#1E2329", "#0E1116"]],
  ["editorial", "Editorial", ["#FAF7F0", "#D8D0C5", "#2F343B", "#B94D3A"]],
  ["electric", "Electric tech", ["#F8FAFF", "#8DE3FF", "#2630FF", "#111827"]],
  ["nature", "Organikus", ["#FAF8EF", "#BFD7B5", "#36594C", "#D96C3B"]],
  ["rose", "Rose premium", ["#FFF7F8", "#E8B4BC", "#332B31", "#C44569"]],
  ["blueprint", "Blueprint", ["#F3F8FF", "#9DB7D6", "#1D3557", "#457B9D"]],
  ["sunset", "Sunset", ["#FFF1E6", "#F7B267", "#2B2D42", "#F25C54"]],
  ["minimal", "Minimal fehér", ["#FFFFFF", "#E9ECEF", "#343A40", "#ADB5BD"]]
];

const priorityLabels: Record<string, string> = {
  automation: "Automatizált folyamatok",
  conversion: "Több érdeklődő / jobb konverzió",
  quality: "Minőség és prémium megjelenés",
  scalable: "Később bővíthető rendszer",
  speed: "Gyors indulás"
};

function splitLines(value: string | null) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPrice(value: number | null, currency = "Ft") {
  if (!value) {
    return "Egyeztetés alapján";
  }

  return `${new Intl.NumberFormat("hu-HU").format(value)} ${currency}`;
}

function hasOffer(project: Project) {
  return project.offer_status === "sent" || Boolean(project.offer_title || project.offer_price || project.offer_summary);
}

function parseBrief(value: string | null) {
  const pairs = splitLines(value).map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return ["Megjegyzés", line] as const;
    }

    return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()] as const;
  });

  return Object.fromEntries(pairs) as Record<string, string>;
}

function paletteByName(name?: string) {
  return paletteOptions.find(([, label]) => label === name)?.[2] ?? paletteOptions[0][2];
}

type ClientPortalProps = {
  view?: "auth" | "dashboard";
};

export function ClientPortal({ view = "auth" }: ClientPortalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "statuses" | "support" | "account">("overview");
  const [authForm, setAuthForm] = useState({ email: "", name: "", password: "" });
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [projectForm, setProjectForm] = useState(initialProject);
  const [projectStep, setProjectStep] = useState(0);
  const [projectSubmitted, setProjectSubmitted] = useState(false);
  const [submittedProjectTitle, setSubmittedProjectTitle] = useState("");
  const [ticketForm, setTicketForm] = useState(initialTicket);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [reply, setReply] = useState("");
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketRatingComment, setTicketRatingComment] = useState("");
  const [notice, setNotice] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? tickets[0],
    [activeTicketId, tickets]
  );

  const openTickets = tickets.filter((ticket) => ticket.status === "open").length;
  const latestProject = projects[0];
  const selectedProjectType = projectTypeOptions.find(([value]) => value === projectForm.projectType) ?? projectTypeOptions[0];
  const selectedVibe = vibeOptions.find(([value]) => value === projectForm.vibe) ?? vibeOptions[0];
  const selectedPalette = paletteOptions.find(([value]) => value === projectForm.palette) ?? paletteOptions[0];
  const briefProgress = Math.round(((projectStep + 1) / briefSteps.length) * 100);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        if (view === "dashboard") {
          window.location.href = "/ugyfelkapu";
          return;
        }

        setLoading(false);
        return;
      }

      setUserId(sessionUser.id);
      setEmail(sessionUser.email ?? "");
      if (view === "auth") {
        window.location.href = "/ugyfelkapu/dashboard";
        return;
      }

      loadPortal();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUserId(sessionUser?.id ?? "");
      setEmail(sessionUser?.email ?? "");
      if (sessionUser) {
        if (view === "auth") {
          window.location.href = "/ugyfelkapu/dashboard";
          return;
        }

        loadPortal();
      } else {
        setProjects([]);
        setTickets([]);
        setMessages({});
        if (view === "dashboard") {
          window.location.href = "/ugyfelkapu";
        }
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [view]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`client-portal-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "client_projects"
        },
        () => loadPortal(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `user_id=eq.${userId}`,
          schema: "public",
          table: "client_tickets"
        },
        () => loadPortal(true)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_ticket_messages"
        },
        (payload) => {
          const nextMessage = payload.new as TicketMessage & { user_id?: string };
          setMessages((current) => {
            const ticketMessages = current[nextMessage.ticket_id] ?? [];
            if (ticketMessages.some((item) => item.id === nextMessage.id)) {
              return current;
            }

            return {
              ...current,
              [nextMessage.ticket_id]: [...ticketMessages, nextMessage]
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadPortal(silent = false) {
    if (!silent) {
      setLoading(true);
    }

    const [{ data: projectData, error: projectError }, { data: ticketData, error: ticketError }] =
      await Promise.all([
        supabase.from("client_projects").select("*").order("created_at", { ascending: false }),
        supabase.from("client_tickets").select("*").order("last_message_at", { ascending: false })
      ]);

    if (projectError || ticketError) {
      setNotice("Nem sikerült betölteni az ügyfélkaput. Lehet, hogy a Supabase SQL még nincs lefuttatva.");
      setLoading(false);
      return;
    }

    const ticketIds = (ticketData ?? []).map((ticket) => ticket.id);
    const { data: messageData, error: messageError } = ticketIds.length
      ? await supabase
          .from("client_ticket_messages")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (messageError) {
      setNotice("A ticket előzményeket nem sikerült betölteni.");
      setLoading(false);
      return;
    }

    const grouped = (messageData ?? []).reduce<Record<string, TicketMessage[]>>((result, item) => {
      result[item.ticket_id] = [...(result[item.ticket_id] ?? []), item];
      return result;
    }, {});

    setProjects(projectData ?? []);
    setTickets(ticketData ?? []);
    setMessages(grouped);
    setActiveTicketId((current) => current || ticketData?.[0]?.id || "");
    setLoading(false);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(mode === "login" ? "Beléptetés..." : "Fiók létrehozása...");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password
      });

      if (error) {
        setNotice("Nem sikerült belépni. Ellenőrizd az emailt és a jelszót.");
        return;
      }
      window.location.href = "/ugyfelkapu/dashboard";
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          full_name: authForm.name || authForm.email
        },
        emailRedirectTo: `${window.location.origin}/ugyfelkapu/dashboard`
      }
    });

    if (error) {
      setNotice("Nem sikerült létrehozni a fiókot. Próbálj erősebb jelszót vagy másik emailt.");
      return;
    }

    if (data.user) {
      await supabase.from("client_profiles").upsert({
        email: authForm.email,
        full_name: authForm.name || authForm.email,
        id: data.user.id
      });
    }

    if (data.session) {
      window.location.href = "/ugyfelkapu/dashboard";
      return;
    }

    setCanResendConfirmation(true);
    setNotice("Fiók kész. Ha az email megerősítés be van kapcsolva Supabase-ben, kapsz egy megerősítő emailt. Nézd meg a Spam/Promóciók mappát is.");
  }

  async function resendConfirmation() {
    if (!authForm.email) {
      setNotice("Írd be az email címedet, és újraküldöm a megerősítést.");
      return;
    }

    setNotice("Megerősítő email újraküldése...");
    const { error } = await supabase.auth.resend({
      email: authForm.email,
      options: {
        emailRedirectTo: `${window.location.origin}/ugyfelkapu/dashboard`
      },
      type: "signup"
    });

    if (error) {
      setNotice("Nem sikerült újraküldeni. Supabase-ben ellenőrizd az Auth email beállításokat vagy próbáld később.");
      return;
    }

    setNotice("Elküldtem újra a megerősítő emailt. Nézd meg a Spam/Promóciók mappát is.");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    if (!projectForm.title.trim()) {
      setProjectStep(0);
      setNotice("Adj nevet a projektnek, hogy el tudjam menteni.");
      return;
    }

    if (!projectForm.goals.trim()) {
      setProjectStep(1);
      setNotice("Írd le röviden, mit szeretnél elérni az oldallal.");
      return;
    }

    setNotice("Projekt mentése...");
    const detailedGoals = [
      `Cél: ${projectForm.goals}`,
      projectForm.audience ? `Célközönség / vásárlók: ${projectForm.audience}` : "",
      projectForm.pages ? `Fontos oldalak: ${projectForm.pages}` : "",
      projectForm.features ? `Kért funkciók: ${projectForm.features}` : "",
      projectForm.style ? `Stílus / hangulat: ${projectForm.style}` : "",
      `Vizuális karakter: ${selectedVibe[1]}`,
      `Színirány: ${selectedPalette[1]}`,
      `Prioritás: ${priorityLabels[projectForm.priority] ?? projectForm.priority}`
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.from("client_projects").insert({
      budget: projectForm.budget,
      company: projectForm.company || null,
      contact_email: email,
      contact_name: authForm.name || email,
      goals: detailedGoals,
      project_type: projectForm.projectType,
      title: projectForm.title,
      user_id: userId,
      website: projectForm.website || null
    });

    if (error) {
      setNotice("Nem sikerült elindítani a projektet.");
      return;
    }

    setProjectForm(initialProject);
    setProjectSubmitted(true);
    setSubmittedProjectTitle(projectForm.title);
    setNotice("Elmentettük és elküldtük a tervet. Hamarosan jelentkezünk a következő lépésekkel.");
    loadPortal(true);
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setNotice("Ticket nyitása...");
    const { data: ticket, error: ticketError } = await supabase
      .from("client_tickets")
      .insert({
        contact_email: email,
        contact_name: authForm.name || email,
        project_id: ticketForm.projectId || null,
        subject: ticketForm.subject,
        user_id: userId
      })
      .select("*")
      .single();

    if (ticketError || !ticket) {
      setNotice("Nem sikerült ticketet nyitni.");
      return;
    }

    const { error: messageError } = await supabase.from("client_ticket_messages").insert({
      body: ticketForm.body,
      sender: "customer",
      ticket_id: ticket.id,
      user_id: userId
    });

    if (messageError) {
      setNotice("A ticket létrejött, de az első üzenet nem ment el.");
      return;
    }

    setTicketForm(initialTicket);
    setActiveTicketId(ticket.id);
    setNotice("Ticket megnyitva.");
    loadPortal(true);
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || !reply.trim() || !userId || activeTicket.status === "closed") {
      return;
    }

    const { error } = await supabase.from("client_ticket_messages").insert({
      body: reply.trim(),
      sender: "customer",
      ticket_id: activeTicket.id,
      user_id: userId
    });

    if (error) {
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    setReply("");
  }

  async function submitTicketRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTicket || !ticketRating) {
      setNotice("Válassz 1 és 5 közötti értékelést.");
      return;
    }

    const { error } = await supabase
      .from("client_tickets")
      .update({
        rating: ticketRating,
        rating_comment: ticketRatingComment || null
      })
      .eq("id", activeTicket.id);

    if (error) {
      setNotice("Nem sikerült menteni az értékelést.");
      return;
    }

    setTicketRating(0);
    setTicketRatingComment("");
    setNotice("Köszönöm az értékelést.");
    loadPortal(true);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setNotice("");
  }

  function renderProjectCard(project: Project, expanded = false) {
    const brief = parseBrief(project.goals);
    const palette = paletteByName(brief["Színirány"]);
    const briefFields = [
      ["Cél", brief["Cél"]],
      ["Célközönség", brief["Célközönség / vásárlók"]],
      ["Oldalak", brief["Fontos oldalak"]],
      ["Funkciók", brief["Kért funkciók"]],
      ["Stílus", brief["Stílus / hangulat"]],
      ["Karakter", brief["Vizuális karakter"]],
      ["Prioritás", brief["Prioritás"]]
    ].filter(([, value]) => Boolean(value));

    return (
      <article className={`project-status-card detailed ${expanded ? "expanded" : ""}`} key={project.id}>
        <div className="project-status-head">
          <div>
            <strong>{project.title}</strong>
            <small>{project.project_type} · {project.budget || "büdzsé nélkül"}</small>
          </div>
          <span>{statusLabels[project.status] ?? project.status}</span>
        </div>
        <div className="project-progress-line">
          {projectFlow.map(([value, label]) => (
            <span className={project.status === value ? "active" : ""} key={value}>
              {label}
            </span>
          ))}
        </div>
        <p>{project.next_step || "Amint átnéztem, itt jelenik meg a következő lépés."}</p>
        <div className="project-brief-visual">
          <div className="project-brief-main">
            <span>Beküldött terv</span>
            <strong>{brief["Cél"] || project.goals}</strong>
          </div>
          <div className="project-brief-palette">
            <span>{brief["Színirány"] || "Színirány"}</span>
            <div>
              {palette.map((color) => (
                <i key={color} style={{ background: color }} />
              ))}
            </div>
          </div>
        </div>
        <div className="project-brief-grid">
          {briefFields.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        {hasOffer(project) ? (
          <section className="client-offer-card">
            <div className="client-offer-header">
              <div>
                <span>Részletes ajánlat</span>
                <h3>{project.offer_title || `${project.title} ajánlat`}</h3>
              </div>
              <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
            </div>
            {project.offer_summary ? <p>{project.offer_summary}</p> : null}
            <div className="client-offer-grid">
              <div>
                <span>Mit tartalmaz?</span>
                <p>{project.offer_scope || "A részletes scope hamarosan megjelenik itt."}</p>
              </div>
              <div>
                <span>Ütemezés</span>
                <p>{project.offer_timeline || "Az ütemezést az ajánlat véglegesítésekor pontosítjuk."}</p>
              </div>
            </div>
            {splitLines(project.offer_deliverables).length ? (
              <ul className="client-offer-list">
                {splitLines(project.offer_deliverables).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {project.offer_note ? <p className="client-offer-note">{project.offer_note}</p> : null}
          </section>
        ) : (
          <div className="project-awaiting-offer">
            <strong>Ajánlat előkészítés alatt</strong>
            <p>Ha megvan az irány, itt fogod látni a bontást, az ütemezést és az árat.</p>
          </div>
        )}
      </article>
    );
  }

  if (view === "auth") {
    return (
      <section className="portal-auth">
        <div className="portal-auth-copy">
          <p className="micro-label">Ügyfélkapu</p>
          <h1>Saját projektfelület, nem elvesző emailek.</h1>
          <p>
            Itt tudsz projektet indítani, ticketet nyitni, visszanézni a beszélgetéseket és látni,
            hol tart a közös munka.
          </p>
        </div>
        <form className="portal-card" onSubmit={submitAuth}>
          <div className="portal-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
              Belépés
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">
              Regisztráció
            </button>
          </div>
          {mode === "register" ? (
            <div className="field">
              <label htmlFor="client-name">Név</label>
              <input
                id="client-name"
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Kovács Anna"
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="client-email">Email</label>
            <input
              id="client-email"
              required
              type="email"
              value={authForm.email}
              onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="hello@vallalkozasod.hu"
            />
          </div>
          <div className="field">
            <label htmlFor="client-password">Jelszó</label>
            <input
              id="client-password"
              required
              minLength={6}
              type="password"
              value={authForm.password}
              onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Legalább 6 karakter"
            />
          </div>
          <button className="button primary" type="submit">
            {mode === "login" ? "Belépés" : "Fiók létrehozása"}
          </button>
          {mode === "register" && canResendConfirmation ? (
            <button className="button secondary portal-resend" onClick={resendConfirmation} type="button">
              Megerősítő email újraküldése
            </button>
          ) : null}
          <p className="form-status">{notice}</p>
        </form>
      </section>
    );
  }

  if (!userId) {
    return (
      <section className="client-portal">
        <div className="portal-card">
          <p className="micro-label">Ügyfél dashboard</p>
          <h1>Átirányítás...</h1>
          <p>Ha nem vagy bejelentkezve, visszaviszünk a belépéshez.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="client-portal">
      <header className="portal-header">
        <div>
          <p className="micro-label">Ügyfél dashboard</p>
          <h1>ProjectEdge dashboard</h1>
          <p>Projektindítás, státusz, support és előzmények egyetlen privát felületen.</p>
        </div>
        <div className="portal-user-chip">
          <span>{email}</span>
          <button onClick={signOut} type="button">Kilépés</button>
        </div>
      </header>

      {notice ? <p className="portal-notice">{notice}</p> : null}

      <section className="portal-command-center">
        <article>
          <span>Aktív projektek</span>
          <strong>{projects.length}</strong>
          <p>{latestProject ? `${latestProject.title} · ${statusLabels[latestProject.status] ?? latestProject.status}` : "Indítsd el az első projektet."}</p>
        </article>
        <article>
          <span>Nyitott ticketek</span>
          <strong>{openTickets}</strong>
          <p>{openTickets ? "Van aktív egyeztetés." : "Nincs megválaszolatlan kérdés."}</p>
        </article>
        <article>
          <span>Következő lépés</span>
          <strong>{latestProject ? "Folyamatban" : "Brief"}</strong>
          <p>{latestProject?.next_step || "Írd le röviden, mit építsünk vagy javítsunk."}</p>
        </article>
      </section>

      <nav className="portal-dashboard-tabs" aria-label="Dashboard fülek">
        {[
          ["overview", "Áttekintés"],
          ["projects", "Projektek"],
          ["statuses", "Státuszok"],
          ["support", "Support"],
          ["account", "Fiók"]
        ].map(([value, label]) => (
          <button
            className={activeTab === value ? "active" : ""}
            key={value}
            onClick={() => setActiveTab(value as typeof activeTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <div className="portal-dashboard-grid">
          <section className="portal-panel hero">
            <div>
              <p className="micro-label dark">Projektindítás</p>
              <h2>Indítsd el a következő munkát egy rövid briefből.</h2>
              <p>Nem kell kész specifikáció. Elég, ha leírod a célt, a jelenlegi helyzetet és mi lenne jó eredmény.</p>
            </div>
            <button className="button primary" onClick={() => setActiveTab("projects")} type="button">
              Projekt indítása
            </button>
          </section>
          <section className="portal-panel">
            <div className="portal-panel-head">
              <span>Legutóbbi projekt</span>
              <button onClick={() => setActiveTab("projects")} type="button">Megnyitás</button>
            </div>
            {latestProject ? (
              <article className="project-status-card featured">
                <div>
                  <strong>{latestProject.title}</strong>
                  <span>{statusLabels[latestProject.status] ?? latestProject.status}</span>
                </div>
                <p>{latestProject.next_step || "Átnézés alatt. Hamarosan megjelenik itt a következő lépés."}</p>
                {hasOffer(latestProject) ? (
                  <div className="project-offer-mini">
                    <span>Aktív ajánlat</span>
                    <strong>{formatPrice(latestProject.offer_price, latestProject.offer_currency || "Ft")}</strong>
                    <small>{latestProject.offer_title || "Részletes ajánlat elérhető a Projektek fülön."}</small>
                  </div>
                ) : null}
              </article>
            ) : (
              <div className="portal-empty-state">
                <strong>Még nincs projekted.</strong>
                <p>A projektindítás után itt látod a státuszt, a következő lépést és minden kapcsolódó ticketet.</p>
              </div>
            )}
          </section>
          <section className="portal-panel">
            <div className="portal-panel-head">
              <span>Support</span>
              <button onClick={() => setActiveTab("support")} type="button">Ticketek</button>
            </div>
            <div className="portal-mini-list">
              {tickets.slice(0, 3).map((ticket) => (
                <button key={ticket.id} onClick={() => { setActiveTicketId(ticket.id); setActiveTab("support"); }} type="button">
                  <strong>{ticket.subject}</strong>
                  <span>{statusLabels[ticket.status] ?? ticket.status}</span>
                </button>
              ))}
              {tickets.length === 0 ? <p>Nincs ticket előzményed. Kérdés esetén a Support fülön tudsz írni.</p> : null}
            </div>
          </section>
          <section className="portal-panel muted">
            <span>Mit kapsz itt?</span>
            <ul>
              <li>Projektállapot és következő lépés</li>
              <li>Ticket előzmények és privát chat</li>
              <li>Adminból frissített státuszok</li>
              <li>Lezárt ticket után értékelés</li>
            </ul>
          </section>
        </div>
      ) : null}

      {activeTab === "projects" ? (
        <div className="project-studio-layout">
          <section className="project-wizard-card">
            <div className="wizard-topline">
              <div>
                <span>Projekt brief</span>
                <h2>{projectSubmitted ? "Terv elküldve" : briefSteps[projectStep]}</h2>
              </div>
              <strong>{projectSubmitted ? "Kész" : `${briefProgress}%`}</strong>
            </div>
            {projectSubmitted ? (
              <div className="wizard-success">
                <div className="success-mark">✓</div>
                <span>Elmentettük és elküldtük</span>
                <h3>{submittedProjectTitle || "A projektterv"}</h3>
                <p>
                  Köszönöm, megkaptam a briefet. Átnézem a célokat, a funkciókat és a vizuális irányt,
                  majd a következő lépéseket és az ajánlatot itt fogod látni a dashboardban.
                </p>
                <div className="wizard-success-actions">
                  <button className="button primary" onClick={() => setActiveTab("statuses")} type="button">
                    Státusz megnyitása
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setProjectSubmitted(false);
                      setProjectStep(0);
                    }}
                    type="button"
                  >
                    Új projekt indítása
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="wizard-progress">
                  {briefSteps.map((step, index) => (
                    <button
                      className={index === projectStep ? "active" : index < projectStep ? "done" : ""}
                      key={step}
                      onClick={() => setProjectStep(index)}
                      type="button"
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </button>
                  ))}
                </div>
                <form className="wizard-form" onSubmit={createProject}>
                  <div className="wizard-slide" key={projectStep}>
                {projectStep === 0 ? (
                  <>
                    <div className="wizard-visual foundation">
                      <div className="mini-browser">
                        <span />
                        <span />
                        <span />
                        <strong>{projectForm.company || "Márkád"}</strong>
                      </div>
                      <div className="floating-card one">Landing</div>
                      <div className="floating-card two">Admin</div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-title">Mi legyen a projekt neve?</label>
                      <input
                        id="project-title"
                        required
                        value={projectForm.title}
                        onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Például: új weboldal, redesign, ügyfélkapu..."
                      />
                    </div>
                    <div className="wizard-two">
                      <div className="field">
                        <label htmlFor="project-company">Cég / márka</label>
                        <input
                          id="project-company"
                          value={projectForm.company}
                          onChange={(event) => setProjectForm((current) => ({ ...current, company: event.target.value }))}
                          placeholder="Vállalkozás neve"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="project-website">Van már weboldal?</label>
                        <input
                          id="project-website"
                          value={projectForm.website}
                          onChange={(event) => setProjectForm((current) => ({ ...current, website: event.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="choice-grid">
                      {projectTypeOptions.map(([value, label, description]) => (
                        <button
                          className={projectForm.projectType === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, projectType: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {projectStep === 1 ? (
                  <>
                    <div className="wizard-visual goals">
                      <div className="goal-orbit">
                        <span>Lead</span>
                        <span>Bizalom</span>
                        <span>Rendszer</span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-goals">Mit szeretnél, hogy az oldal elérjen?</label>
                      <textarea
                        id="project-goals"
                        required
                        value={projectForm.goals}
                        onChange={(event) => setProjectForm((current) => ({ ...current, goals: event.target.value }))}
                        placeholder="Írd le emberien: mi most a gond, mi lenne a jó eredmény, miben kéne segítenie az oldalnak?"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="project-audience">Kiknek készül?</label>
                      <textarea
                        id="project-audience"
                        value={projectForm.audience}
                        onChange={(event) => setProjectForm((current) => ({ ...current, audience: event.target.value }))}
                        placeholder="Például: helyi vállalkozók, prémium ügyfelek, B2B döntéshozók, visszatérő vásárlók..."
                      />
                    </div>
                    <div className="choice-grid compact">
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <button
                          className={projectForm.priority === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, priority: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}

                {projectStep === 2 ? (
                  <>
                    <div className="wizard-visual structure">
                      <div>Főoldal</div>
                      <div>Ajánlatkérés</div>
                      <div>Admin</div>
                      <div>Automatizmus</div>
                    </div>
                    <div className="wizard-two">
                      <div className="field">
                        <label htmlFor="project-pages">Milyen oldalak kellenek?</label>
                        <textarea
                          id="project-pages"
                          value={projectForm.pages}
                          onChange={(event) => setProjectForm((current) => ({ ...current, pages: event.target.value }))}
                          placeholder="Főoldal, szolgáltatások, árak, referenciák, kapcsolat, blog, ügyfélkapu..."
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="project-features">Milyen funkciókat szeretnél?</label>
                        <textarea
                          id="project-features"
                          value={projectForm.features}
                          onChange={(event) => setProjectForm((current) => ({ ...current, features: event.target.value }))}
                          placeholder="Ajánlatkérés, admin, chat, fizetés, időpontfoglalás, CRM, email automatizmus..."
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="project-budget">Mekkora kerettel gondolkodsz?</label>
                      <select
                        id="project-budget"
                        value={projectForm.budget}
                        onChange={(event) => setProjectForm((current) => ({ ...current, budget: event.target.value }))}
                      >
                        <option value="not-sure">Még nem tudom</option>
                        <option value="100k-300k">100 000 - 300 000 Ft</option>
                        <option value="300k-600k">300 000 - 600 000 Ft</option>
                        <option value="600k-1m">600 000 - 1 000 000 Ft</option>
                        <option value="1m-plus">1 000 000 Ft felett</option>
                      </select>
                    </div>
                  </>
                ) : null}

                {projectStep === 3 ? (
                  <>
                    <div className="wizard-visual style-lab">
                      <div className={`style-card ${projectForm.vibe}`}>
                        <span>{selectedVibe[1]}</span>
                        <strong>{projectForm.company || "Márka"}</strong>
                        <p>{selectedVibe[2]}</p>
                      </div>
                    </div>
                    <div className="choice-grid">
                      {vibeOptions.map(([value, label, description]) => (
                        <button
                          className={projectForm.vibe === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, vibe: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>{description}</span>
                        </button>
                      ))}
                    </div>
                    <div className="palette-grid">
                      {paletteOptions.map(([value, label, colors]) => (
                        <button
                          className={projectForm.palette === value ? "selected" : ""}
                          key={value}
                          onClick={() => setProjectForm((current) => ({ ...current, palette: value }))}
                          type="button"
                        >
                          <strong>{label}</strong>
                          <span>
                            {colors.map((color) => (
                              <i key={color} style={{ background: color }} />
                            ))}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="field">
                      <label htmlFor="project-style">Van konkrét stílus, példa vagy tiltólista?</label>
                      <textarea
                        id="project-style"
                        value={projectForm.style}
                        onChange={(event) => setProjectForm((current) => ({ ...current, style: event.target.value }))}
                        placeholder="Például: sötét prémium, nagy tipó, kevés stock fotó, animált 3D, ne legyen túl corporate..."
                      />
                    </div>
                  </>
                ) : null}

                {projectStep === 4 ? (
                  <div className="wizard-summary">
                    <div className="summary-hero">
                      <span>Beküldés előtt</span>
                      <h3>{projectForm.title || "Új projekt"}</h3>
                      <p>{projectForm.goals || "A cél még nincs megadva."}</p>
                    </div>
                    <div className="summary-grid">
                      <div>
                        <span>Projekt típusa</span>
                        <strong>{selectedProjectType[1]}</strong>
                      </div>
                      <div>
                        <span>Stílus</span>
                        <strong>{selectedVibe[1]}</strong>
                      </div>
                      <div>
                        <span>Paletta</span>
                        <strong>{selectedPalette[1]}</strong>
                      </div>
                      <div>
                        <span>Büdzsé</span>
                        <strong>{projectForm.budget}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

                  <div className="wizard-actions">
                    <button
                      className="button secondary"
                      disabled={projectStep === 0}
                      onClick={() => setProjectStep((current) => Math.max(0, current - 1))}
                      type="button"
                    >
                      Vissza
                    </button>
                    {projectStep < briefSteps.length - 1 ? (
                      <button
                        className="button primary"
                        onClick={() => setProjectStep((current) => Math.min(briefSteps.length - 1, current + 1))}
                        type="button"
                      >
                        Következő
                      </button>
                    ) : (
                      <button className="button primary" type="submit">
                        Projektkérés küldése
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </section>

          <aside className="project-brief-preview">
            <section className="live-brief-card">
              <div className="live-brief-head">
                <span>Élő brief</span>
                <strong>{briefProgress}% kész</strong>
              </div>
              <h3>{projectForm.title || "A projekt neve ide kerül"}</h3>
              <p>{projectForm.goals || "Ahogy válaszolsz, itt épül össze az anyag, amiből ajánlatot tudok adni."}</p>
              <div className="live-brief-tags">
                <span>{selectedProjectType[1]}</span>
                <span>{selectedVibe[1]}</span>
                <span>{priorityLabels[projectForm.priority]}</span>
              </div>
              <div className="live-palette">
                {selectedPalette[2].map((color) => (
                  <i key={color} style={{ background: color }} />
                ))}
              </div>
              <div className="live-brief-list">
                <div>
                  <span>Célközönség</span>
                  <strong>{projectForm.audience || "Még nincs megadva"}</strong>
                </div>
                <div>
                  <span>Oldalak</span>
                  <strong>{projectForm.pages || "Később pontosítjuk"}</strong>
                </div>
                <div>
                  <span>Funkciók</span>
                  <strong>{projectForm.features || "Később pontosítjuk"}</strong>
                </div>
              </div>
            </section>

            <section className="portal-panel compact-projects">
              <div className="portal-panel-head">
                <span>Projekt státuszok</span>
                <small>{projects.length} projekt</small>
              </div>
              <div className="project-list refined">
                {loading ? <p>Betöltés...</p> : null}
                {!loading && projects.length === 0 ? (
                  <div className="portal-empty-state">
                    <strong>Még nincs projekted.</strong>
                    <p>Az első projektkérés után itt jelenik meg a státusz és a következő lépés.</p>
                  </div>
                ) : null}
                {projects.map((project) => renderProjectCard(project))}
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {activeTab === "statuses" ? (
        <section className="status-page-panel">
          <div className="status-page-head">
            <div>
              <span>Projekt státuszok</span>
              <h2>Innen látod nagyban, hol tartunk.</h2>
            </div>
            <button className="button primary" onClick={() => setActiveTab("projects")} type="button">
              Új projekt brief
            </button>
          </div>
          <div className="status-page-grid">
            {loading ? <p>Betöltés...</p> : null}
            {!loading && projects.length === 0 ? (
              <div className="portal-empty-state">
                <strong>Még nincs projekted.</strong>
                <p>Indíts egy projekt briefet, és itt látod majd a státuszt, a tennivalókat és az ajánlatot.</p>
              </div>
            ) : null}
            {projects.map((project) => renderProjectCard(project, true))}
          </div>
        </section>
      ) : null}

      {activeTab === "support" ? (
        <div className="portal-dashboard-grid support">
          <section className="portal-panel form-panel">
            <div className="portal-panel-head">
              <span>Új support ticket</span>
              <small>Privát beszélgetés</small>
            </div>
            <form className="portal-form" onSubmit={createTicket}>
              <div className="field">
                <label htmlFor="ticket-project">Kapcsolódó projekt</label>
                <select
                  id="ticket-project"
                  value={ticketForm.projectId}
                  onChange={(event) => setTicketForm((current) => ({ ...current, projectId: event.target.value }))}
                >
                  <option value="">Általános kérdés</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.title}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="ticket-subject">Tárgy</label>
                <input
                  id="ticket-subject"
                  required
                  value={ticketForm.subject}
                  onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Például: kérdés a kezdésről"
                />
              </div>
              <div className="field">
                <label htmlFor="ticket-body">Üzenet</label>
                <textarea
                  id="ticket-body"
                  required
                  value={ticketForm.body}
                  onChange={(event) => setTicketForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Írd le, miben segítsek."
                />
              </div>
              <button className="button primary" type="submit">
                Ticket megnyitása
              </button>
            </form>
          </section>

          <section className="portal-panel ticket-history">
            <div className="portal-panel-head">
              <span>Ticket előzmények</span>
              <small>{tickets.length} beszélgetés</small>
            </div>
            <div className="ticket-layout">
              <div className="ticket-list">
                {tickets.length === 0 ? <p>Még nincs ticketed.</p> : null}
                {tickets.map((ticket) => (
                  <button
                    className={activeTicket?.id === ticket.id ? "active" : ""}
                    key={ticket.id}
                    onClick={() => setActiveTicketId(ticket.id)}
                    type="button"
                  >
                    <strong>{ticket.subject}</strong>
                    <span>{statusLabels[ticket.status] ?? ticket.status}</span>
                  </button>
                ))}
              </div>
              <div className="portal-chat">
                {activeTicket ? (
                  <>
                    <div className="portal-chat-head">
                      <strong>{activeTicket.subject}</strong>
                      <span>{statusLabels[activeTicket.status] ?? activeTicket.status}</span>
                    </div>
                    <div className="portal-chat-messages">
                      {(messages[activeTicket.id] ?? []).map((item) => (
                        <div className={`portal-bubble ${item.sender}`} key={item.id}>
                          <span>{item.sender === "admin" ? "ProjectEdge" : "Te"}</span>
                          <p>{item.body}</p>
                        </div>
                      ))}
                    </div>
                    <form className="portal-reply" onSubmit={sendReply}>
                      <textarea
                        disabled={activeTicket.status === "closed"}
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder={activeTicket.status === "closed" ? "Ez a ticket lezárva." : "Válasz írása..."}
                      />
                      <button className="button primary" disabled={activeTicket.status === "closed"} type="submit">
                        Küldés
                      </button>
                    </form>
                    {activeTicket.status === "closed" ? (
                      <form className="portal-rating" onSubmit={submitTicketRating}>
                        <strong>{activeTicket.rating ? "Köszönöm az értékelést." : "Milyen volt a segítség?"}</strong>
                        {!activeTicket.rating ? (
                          <>
                            <div className="rating-row" role="radiogroup" aria-label="Ticket értékelése">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                  aria-label={`${value} csillag`}
                                  className={ticketRating >= value ? "active" : ""}
                                  key={value}
                                  onClick={() => setTicketRating(value)}
                                  type="button"
                                >
                                  ★
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={ticketRatingComment}
                              onChange={(event) => setTicketRatingComment(event.target.value)}
                              placeholder="Pár szóban leírhatod, milyen volt a segítség."
                            />
                            <button className="button secondary" type="submit">
                              Értékelés küldése
                            </button>
                          </>
                        ) : null}
                      </form>
                    ) : null}
                  </>
                ) : (
                  <div className="portal-empty-state">
                    <strong>Válassz vagy nyiss ticketet.</strong>
                    <p>Itt fog megjelenni a teljes beszélgetési előzmény.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "account" ? (
        <div className="portal-dashboard-grid account">
          <section className="portal-panel hero">
            <div>
              <p className="micro-label dark">Fiók</p>
              <h2>Ez a privát ügyfélterületed.</h2>
              <p>Innen indítod a projekteket, itt maradnak meg a ticket előzmények, és ide érkeznek a státuszfrissítések.</p>
            </div>
            <button className="button secondary" onClick={signOut} type="button">
              Kilépés
            </button>
          </section>
          <section className="portal-panel">
            <div className="portal-panel-head">
              <span>Fiókadatok</span>
              <small>Supabase Auth</small>
            </div>
            <div className="account-list">
              <span>Email</span>
              <strong>{email}</strong>
              <span>Projektek</span>
              <strong>{projects.length}</strong>
              <span>Ticketek</span>
              <strong>{tickets.length}</strong>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
