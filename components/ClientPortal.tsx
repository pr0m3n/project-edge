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
  budget: "not-sure",
  company: "",
  goals: "",
  projectType: "premium-business-site",
  title: "",
  website: ""
};

const initialTicket = {
  body: "",
  projectId: "",
  subject: ""
};

export function ClientPortal() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ email: "", name: "", password: "" });
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Record<string, TicketMessage[]>>({});
  const [projectForm, setProjectForm] = useState(initialProject);
  const [ticketForm, setTicketForm] = useState(initialTicket);
  const [activeTicketId, setActiveTicketId] = useState("");
  const [reply, setReply] = useState("");
  const [ticketRating, setTicketRating] = useState(0);
  const [ticketRatingComment, setTicketRatingComment] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const activeTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === activeTicketId) ?? tickets[0],
    [activeTicketId, tickets]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        setLoading(false);
        return;
      }

      setUserId(sessionUser.id);
      setEmail(sessionUser.email ?? "");
      loadPortal();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUserId(sessionUser?.id ?? "");
      setEmail(sessionUser?.email ?? "");
      if (sessionUser) {
        loadPortal();
      } else {
        setProjects([]);
        setTickets([]);
        setMessages({});
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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
      }
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password
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

    setNotice(data.session ? "Fiók kész, beléptél." : "Fiók kész. Nézd meg az emailedet a megerősítéshez.");
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      return;
    }

    setNotice("Projekt mentése...");
    const { error } = await supabase.from("client_projects").insert({
      budget: projectForm.budget,
      company: projectForm.company || null,
      contact_email: email,
      contact_name: authForm.name || email,
      goals: projectForm.goals,
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
    setNotice("Projektkérés elküldve. Itt fogod látni a státuszát.");
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

  if (!userId) {
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
          <p className="form-status">{notice}</p>
        </form>
      </section>
    );
  }

  return (
    <section className="client-portal">
      <header className="portal-header">
        <div>
          <p className="micro-label">Ügyfélkapu</p>
          <h1>Projektközpont</h1>
          <p>{email}</p>
        </div>
        <button className="button secondary" onClick={signOut} type="button">
          Kilépés
        </button>
      </header>

      {notice ? <p className="portal-notice">{notice}</p> : null}

      <div className="portal-grid">
        <section className="portal-card">
          <div className="portal-card-head">
            <span>01</span>
            <h2>Új projekt indítása</h2>
          </div>
          <form className="portal-form" onSubmit={createProject}>
            <div className="field">
              <label htmlFor="project-title">Projekt neve</label>
              <input
                id="project-title"
                required
                value={projectForm.title}
                onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Új weboldal / redesign / ügyfélkapu"
              />
            </div>
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
              <label htmlFor="project-website">Jelenlegi weboldal</label>
              <input
                id="project-website"
                value={projectForm.website}
                onChange={(event) => setProjectForm((current) => ({ ...current, website: event.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="field">
              <label htmlFor="project-type">Projekt típusa</label>
              <select
                id="project-type"
                value={projectForm.projectType}
                onChange={(event) => setProjectForm((current) => ({ ...current, projectType: event.target.value }))}
              >
                <option value="premium-business-site">Prémium céges weboldal</option>
                <option value="redesign">Meglévő oldal fejlesztése</option>
                <option value="web-app">Webapp / admin rendszer</option>
                <option value="client-portal">Ügyfélkapu / dashboard</option>
                <option value="care-plan">Karbantartás és növekedés</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="project-budget">Büdzsé</label>
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
            <div className="field">
              <label htmlFor="project-goals">Mit szeretnél elérni?</label>
              <textarea
                id="project-goals"
                required
                value={projectForm.goals}
                onChange={(event) => setProjectForm((current) => ({ ...current, goals: event.target.value }))}
                placeholder="Írd le röviden a helyzetet, a célt és ami most zavar."
              />
            </div>
            <button className="button primary" type="submit">
              Projektkérés küldése
            </button>
          </form>
        </section>

        <section className="portal-card">
          <div className="portal-card-head">
            <span>02</span>
            <h2>Projekt státuszok</h2>
          </div>
          <div className="project-list">
            {loading ? <p>Betöltés...</p> : null}
            {!loading && projects.length === 0 ? <p>Még nincs projekted.</p> : null}
            {projects.map((project) => (
              <article className="project-status-card" key={project.id}>
                <div>
                  <strong>{project.title}</strong>
                  <span>{statusLabels[project.status] ?? project.status}</span>
                </div>
                <p>{project.next_step || "Amint átnéztem, itt jelenik meg a következő lépés."}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="portal-grid tickets">
        <section className="portal-card">
          <div className="portal-card-head">
            <span>03</span>
            <h2>Új ticket</h2>
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

        <section className="portal-card ticket-history">
          <div className="portal-card-head">
            <span>04</span>
            <h2>Ticket előzmények</h2>
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
                <p>Válassz egy ticketet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
