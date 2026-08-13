"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";

/**
 * Belépés, regisztráció és elfelejtett jelszó képernyő.
 *
 * A `ClientPortal` két teljesen külön felületet szolgált ki egyetlen
 * komponensben: a bejelentkezés előtti auth képernyőt és a dashboardot.
 * Ez az előbbi — saját állapota nincs, mindent propból kap, hogy a
 * munkamenet-kezelés egy helyen maradjon.
 */
export type AuthScreenProps = {
  authForm: { email: string; name: string; password: string };
  canResendConfirmation: boolean;
  consentChecked: boolean;
  forgotPasswordEmail: string;
  mode: "login" | "register";
  notice: string;
  showForgotPassword: boolean;
  showPassword: boolean;
  publicBriefPending: boolean;
  onAuthFormChange: Dispatch<SetStateAction<{ email: string; name: string; password: string }>>;
  onConsentChange: Dispatch<SetStateAction<boolean>>;
  onForgotPasswordEmailChange: Dispatch<SetStateAction<string>>;
  onModeChange: Dispatch<SetStateAction<"login" | "register">>;
  onNoticeChange: Dispatch<SetStateAction<string>>;
  onShowForgotPasswordChange: Dispatch<SetStateAction<boolean>>;
  onShowPasswordChange: Dispatch<SetStateAction<boolean>>;
  onResendConfirmation: () => void | Promise<void>;
  onSubmitAuth: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onSubmitForgotPassword: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onContinueWithGoogle: () => void | Promise<void>;
};

export function AuthScreen({
  authForm,
  canResendConfirmation,
  consentChecked,
  forgotPasswordEmail,
  mode,
  notice,
  showForgotPassword,
  showPassword,
  publicBriefPending,
  onAuthFormChange: setAuthForm,
  onConsentChange: setConsentChecked,
  onForgotPasswordEmailChange: setForgotPasswordEmail,
  onModeChange: setMode,
  onNoticeChange: setNotice,
  onShowForgotPasswordChange: setShowForgotPassword,
  onShowPasswordChange: setShowPassword,
  onResendConfirmation: resendConfirmation,
  onSubmitAuth: submitAuth,
  onSubmitForgotPassword: submitForgotPassword,
  onContinueWithGoogle: continueWithGoogle
}: AuthScreenProps) {
    if (showForgotPassword) {
      return (
        <section className="portal-auth">
          <div className="portal-auth-copy">
            <p className="micro-label">Ügyfélkapu</p>
            <h1>Jelszó visszaállítása</h1>
            <p>
              Add meg a regisztrált email címedet, és elküldünk egy linket, amellyel bejelentkezés nélkül beállíthatsz egy új jelszót.
            </p>
          </div>
          <form className="portal-card" onSubmit={submitForgotPassword}>
            <h2 style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '16px' }}>Elfelejtett jelszó</h2>
            <div className="field">
              <label htmlFor="forgot-email">Regisztrált email cím</label>
              <input
                id="forgot-email"
                required
                type="email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                placeholder="hello@vallalkozasod.hu"
              />
            </div>
            <button className="button primary" type="submit">Visszaállító link küldése</button>
            <button
              className="button secondary"
              type="button"
              style={{ marginTop: '12px' }}
              onClick={() => { setShowForgotPassword(false); setNotice(""); }}
            >
              Vissza a bejelentkezéshez
            </button>
            <p className="form-status">{notice}</p>
          </form>
        </section>
      );
    }

    return (
      <section className="portal-auth">
        <div className="portal-auth-copy">
          <p className="micro-label">{publicBriefPending ? "Brief kész · mentés következik" : "Ügyfélkapu"}</p>
          <h1>{publicBriefPending ? "A válaszaid megvannak." : "Saját projektfelület, nem elvesző emailek."}</h1>
          <p>{publicBriefPending ? "Lépj be vagy hozz létre fiókot. Utána a brief automatikusan megnyílik, és a privát anyagokkal kiegészítve te küldheted be." : "Itt tudsz projektet indítani, üzenetet küldeni, visszanézni a beszélgetéseket és látni, hol tart a közös munka."}</p>
          {publicBriefPending ? <div className="brief-handoff-note"><span>✓</span><div><strong>Biztonságosan elmentve ezen az eszközön</strong><small>A fiók létrehozása nem küldi be automatikusan a projektet.</small></div></div> : null}
        </div>
        <form className="portal-card" onSubmit={submitAuth}>
          <div className="portal-tabs">
            <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(""); }} type="button">
              Belépés
            </button>
            <button className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setNotice(""); }} type="button">
              Regisztráció
            </button>
          </div>
          <button className="google-auth-button" onClick={continueWithGoogle} type="button">
            <span aria-hidden="true" className="google-auth-mark">G</span>
            Folytatás Google-lel
          </button>
          <div className="auth-divider" role="separator">
            <span>vagy emaillel</span>
          </div>
          {mode === "register" ? (
            <div className="field">
              <label htmlFor="client-name">Név</label>
              <input
                id="client-name"
                required
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
          <div className="field" style={{ position: 'relative' }}>
            <label htmlFor="client-password">Jelszó</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                id="client-password"
                required
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Legalább 6 karakter"
                style={{ width: '100%', paddingRight: '50px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2
                }}
                aria-label={showPassword ? "Jelszó elrejtése" : "Jelszó megjelenítése"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            {mode === "register" && (
              <small style={{ display: 'block', marginTop: '6px', color: 'var(--muted)', fontSize: '11px', lineHeight: '1.3' }}>
                Legalább 6 karakter hosszú jelszó megadása kötelező.
              </small>
            )}
          </div>
          {mode === "login" && (
            <div style={{ textAlign: 'right', marginTop: '-4px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setNotice(""); }}
                style={{ background: 'none', border: 'none', color: '#76ABAE', cursor: 'pointer', fontSize: '13px', padding: 0 }}
              >
                Elfelejtetted a jelszavad?
              </button>
            </div>
          )}
          {mode === "register" && (
            <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', lineHeight: '1.4', color: 'var(--muted)', cursor: 'pointer', marginBottom: '4px' }}>
              <input
                type="checkbox"
                required
                checked={consentChecked}
                onChange={(event) => setConsentChecked(event.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              <span>
                Elolvastam és elfogadom az{" "}
                <a href="/adatkezeles" target="_blank" style={{ color: '#76ABAE' }}>Adatkezelési tájékoztatót</a>{" "}
                és az{" "}
                <a href="/aszf" target="_blank" style={{ color: '#76ABAE' }}>ÁSZF-et</a>.
              </span>
            </label>
          )}
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
