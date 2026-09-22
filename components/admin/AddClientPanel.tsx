"use client";

import { useMemo, useState, type FormEvent } from "react";
import styles from "@/components/admin/add-client.module.css";
import { supabase } from "@/lib/supabase/client";
import { cycleAmount, cycleDiscount, onboardingSchedule, type BillingInterval } from "@/lib/onboarding";
import { SUBSCRIPTION_PLANS, formatHuf, subscriptionPlan } from "@/lib/subscriptions";

/**
 * ÜGYFÉL HOZZÁADÁSA KÉZZEL.
 *
 * Ez a panel az a hiányzó ajtó, amin a hideg emailből érkező ügyfél be tud
 * jönni a rendszerbe. Eddig nem létezett: az admin felület minden művelete
 * MÓDOSÍTÁS volt egy meglévő soron, létrehozni semmit nem lehetett — így az
 * az ügyfél, akivel telefonon és emailben állapodtunk meg, kívül rekedt.
 *
 * Két dolog, ami szándékos és nem díszítés:
 *
 *  1. ÉLŐ ELŐNÉZET. A jobb oldali doboz azt mutatja, amit az ügyfél a
 *     belépés után LÁTNI fog — a csomagját, a következő esedékességét. A
 *     fordulónap kiszámítása nem triviális (hónapvégi csonkolás, éves ciklus,
 *     hónapokkal ezelőtti kezdés), és ha csak mentés után derülne ki, akkor
 *     egy elgépelt dátum már egy valódi ügyfél valódi számlázását rontaná el.
 *     Ugyanaz a `lib/onboarding.ts` számol itt, ami a szerveren — nem egy
 *     közelítő másolat, ami idővel elcsúszik.
 *
 *  2. A MEZŐK SORRENDJE a beszélgetés sorrendje: ki az ügyfél, mit kap, hogyan
 *     fizet, hova számlázunk. Az űrlapot telefonhívás közben is ki lehet
 *     tölteni, felülről lefelé haladva.
 */

type Props = {
  /** Sikeres felvétel után a szülő újratölti a listáit. */
  onCreated: () => void | Promise<void>;
  onClose: () => void;
  /** Visszajelzés a közös toast-rendszerbe. */
  onNotice: (message: string) => void;
};

type Result = {
  projectTitle: string;
  email: string;
  invited: boolean;
  nextBillingAt: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function AddClientPanel({ onCreated, onClose, onNotice }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const [projectTitle, setProjectTitle] = useState("");
  const [planKey, setPlanKey] = useState<"presence" | "business" | "custom">("presence");
  const [monthlyPrice, setMonthlyPrice] = useState(String(subscriptionPlan("presence").price));
  const [domain, setDomain] = useState("");
  const [liveUrl, setLiveUrl] = useState("");

  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  /** Az ügyfelenként alkudott ciklusdíj. Üresen a listaár érvényes. */
  const [agreedCyclePrice, setAgreedCyclePrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "stripe">("bank_transfer");
  const [startedAt, setStartedAt] = useState(today());
  const [lastPaymentAt, setLastPaymentAt] = useState(today());
  const [recordPayment, setRecordPayment] = useState(true);
  /** Hány ciklust fizetett ki egyben. 1 = egy hónap vagy egy év. */
  const [prepaidPeriods, setPrepaidPeriods] = useState("1");
  const [reference, setReference] = useState("");

  const [billingName, setBillingName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const [origin, setOrigin] = useState<"manual" | "cold_email">("cold_email");
  const [adminNotes, setAdminNotes] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  /**
   * A „most" a renderen kívülről jön.
   *
   * Renderben `Date.now()`-t hívni azért tilos, mert két render között
   * megváltozhat az eredmény, és a React nem tudja, mitől — az azonos
   * bemenetre adott eltérő kimenet pontosan az a fajta instabilitás, amitől
   * egy felület „néha máshogy viselkedik". A lusta kezdőérték egyetlen egyszer
   * fut le, a komponens születésekor — az űrlap élettartama alatt ez bőven
   * elég pontos ahhoz, hogy eldöntsük, késésben van-e az ügyfél.
   */
  const [nowMs] = useState(() => Date.now());

  const price = Number(monthlyPrice);
  const priceValid = Number.isSafeInteger(price) && price >= 1_000 && price <= 10_000_000;

  /**
   * A menetrend előnézete. Ugyanaz a függvény, amit a szerver is hív — ha
   * itt hibát dob (pl. félkész dátum gépelés közben), az nem az egész panelt
   * dönti el, csak az előnézet marad üres.
   */
  const schedule = useMemo(() => {
    try {
      const start = startedAt ? new Date(`${startedAt}T00:00:00.000Z`) : null;
      if (!start || Number.isNaN(start.getTime())) return null;
      const paid = recordPayment && lastPaymentAt ? new Date(`${lastPaymentAt}T00:00:00.000Z`) : null;
      return onboardingSchedule({
        startedAt: start,
        lastPaymentAt: paid,
        interval: billingInterval,
        periods: Math.max(1, Number(prepaidPeriods) || 1)
      });
    } catch {
      return null;
    }
  }, [startedAt, lastPaymentAt, billingInterval, recordPayment, prepaidPeriods]);

  const periodCount = Math.max(1, Number(prepaidPeriods) || 1);
  const agreed = Number(agreedCyclePrice) || null;
  const perCycle = priceValid ? cycleAmount({ monthlyPrice: price, interval: billingInterval, agreed }) : 0;
  const paidAmount = priceValid ? cycleAmount({ monthlyPrice: price, interval: billingInterval, periods: periodCount, agreed }) : 0;
  const discount = priceValid ? cycleDiscount({ monthlyPrice: price, interval: billingInterval, agreed }) : null;
  const listPerCycle = priceValid ? cycleAmount({ monthlyPrice: price, interval: billingInterval }) : 0;
  const plan = subscriptionPlan(planKey);

  function selectPlan(key: "presence" | "business" | "custom") {
    setPlanKey(key);
    // A havidíj követi a csomagot, de utána szabadon felülírható: a
    // megállapodott ár számít, nem a listaár.
    setMonthlyPrice(String(subscriptionPlan(key).price));
    // A kedvezmény a RÉGI csomaghoz tartozott; csomagváltáskor újra kell alkudni.
    setAgreedCyclePrice("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !fullName.trim() || !projectTitle.trim()) {
      setError("Az email cím, a kapcsolattartó neve és a projekt megnevezése kötelező.");
      return;
    }
    if (!priceValid) {
      setError("A havidíjnak 1 000 és 10 000 000 Ft között kell lennie.");
      return;
    }

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("A munkamenet lejárt. Jelentkezz be újra.");

      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          fullName,
          company,
          phone,
          projectTitle,
          subscriptionPlan: planKey,
          monthlyPrice: price,
          billingInterval,
          billingAmount: agreed,
          paymentMethod,
          origin,
          startedAt,
          lastPaymentAt: recordPayment ? lastPaymentAt : null,
          recordPayment,
          prepaidPeriods: periodCount,
          paymentReference: reference,
          domain,
          liveUrl,
          adminNotes,
          marketingOptIn,
          sendInvite,
          billing: {
            name: billingName || company || fullName,
            taxNumber,
            country: "HU",
            postalCode,
            city,
            address
          }
        })
      });

      const payload = await response.json() as { error?: string; invited?: boolean; schedule?: { nextBillingAt: string } };
      if (!response.ok) throw new Error(payload.error || "Az ügyfél felvétele nem sikerült.");

      setResult({
        projectTitle,
        email: email.trim().toLowerCase(),
        invited: Boolean(payload.invited),
        nextBillingAt: payload.schedule?.nextBillingAt ?? ""
      });
      onNotice(`${projectTitle} felvéve az ügyfelek közé.`);
      await onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Az ügyfél felvétele nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <section className={styles.panel}>
        <div className={styles.success}>
          <strong>„{result.projectTitle}” felvéve.</strong>
          <span>
            {result.invited
              ? `Meghívó elment a(z) ${result.email} címre — ezzel tud jelszót állítani magának.`
              : `A fiók létrejött a(z) ${result.email} címhez, de meghívót MÉG NEM küldtünk. Amíg nem küldesz, nem tud belépni.`}
          </span>
          {result.nextBillingAt ? (
            <span>Következő esedékesség: <b>{new Date(result.nextBillingAt).toLocaleDateString("hu-HU")}</b></span>
          ) : null}
        </div>
        <div className={styles.actions}>
          <button className="admin-btn-primary" type="button" onClick={onClose}>Vissza a projektekhez</button>
          <button className="admin-btn-secondary" type="button" onClick={() => { setResult(null); setEmail(""); setFullName(""); setProjectTitle(""); setCompany(""); }}>
            Újabb ügyfél felvétele
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className={styles.panel} onSubmit={submit}>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Ügyfélfelvétel</span>
          <h3>Ügyfél hozzáadása kézzel</h3>
          <p>
            Annak való, akivel telefonon vagy emailben állapodtál meg, és a weboldala már él. A mentés
            után azonnal látja a saját felületét: a csomagját, a következő esedékességét, a fizetési
            előzményét és a módosítási keretét.
          </p>
        </div>
        <button className="admin-btn-secondary" type="button" onClick={onClose}>Mégsem</button>
      </header>

      <div className={styles.layout}>
        <div className={styles.form}>
          {/* ── 1. Ki az ügyfél ─────────────────────────────────────────── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>1 · Az ügyfél</div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Email cím *</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nev@ceg.hu" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Kapcsolattartó neve *</span>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Kovács Anna" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Cégnév</span>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Példa Kft." autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Telefon</span>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+36 30 123 4567" autoComplete="off" />
              </label>
            </div>
            <p className={styles.hint}>
              Az email cím lesz a belépési azonosítója. Ha ezzel a címmel már van fiók, arra kötjük rá — új nem születik.
            </p>
          </div>

          {/* ── 2. Mit kap ──────────────────────────────────────────────── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>2 · A szolgáltatás</div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Projekt megnevezése *</span>
                <input type="text" required value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} placeholder="Példa Kft. weboldal" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Csomag</span>
                <select value={planKey} onChange={(e) => selectPlan(e.target.value as typeof planKey)}>
                  {SUBSCRIPTION_PLANS.map((item) => (
                    <option key={item.key} value={item.key}>{item.name} — {formatHuf(item.price)}/hó</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Megállapodott havidíj (Ft) *</span>
                <input
                  type="number" required min={1000} max={10000000} step={100}
                  value={monthlyPrice}
                  aria-invalid={!priceValid}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Domain</span>
                <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="peldakft.hu" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Éles weboldal címe</span>
                <input type="text" value={liveUrl} onChange={(e) => setLiveUrl(e.target.value)} placeholder="https://peldakft.hu" autoComplete="off" />
              </label>
            </div>
            <p className={styles.hint}>
              A havidíj akkor is felülírható, ha eltér a listaártól — a megállapodás számít. Az éles cím
              kell az elérhetőség-ellenőrzéshez és a havi jelentéshez.
            </p>
          </div>

          {/* ── 3. Hogyan fizet ─────────────────────────────────────────── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>3 · A fizetés</div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Fizetési mód</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
                  <option value="bank_transfer">Banki átutalás</option>
                  <option value="stripe">Bankkártya (Stripe)</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Számlázási ciklus</span>
                <select value={billingInterval} onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}>
                  <option value="month">Havi</option>
                  <option value="year">Éves, előre</option>
                </select>
              </label>
              <label className={styles.field}>
                <span>Amit egy ciklusban fizet (Ft)</span>
                <input
                  type="number" min={1000} max={10000000} step={100}
                  value={agreedCyclePrice}
                  placeholder={listPerCycle ? String(listPerCycle) : ""}
                  onChange={(e) => setAgreedCyclePrice(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>A szolgáltatás kezdete *</span>
                <input type="date" required value={startedAt} max={today()} onChange={(e) => setStartedAt(e.target.value)} />
              </label>
              {recordPayment ? (
                <label className={styles.field}>
                  <span>Mikor fizetett utoljára</span>
                  <input type="date" value={lastPaymentAt} max={today()} onChange={(e) => setLastPaymentAt(e.target.value)} />
                </label>
              ) : null}
              {recordPayment ? (
                <label className={styles.field}>
                  <span>Hány {billingInterval === "year" ? "évet" : "hónapot"} fizetett előre</span>
                  <input
                    type="number" min={1} max={120} step={1}
                    value={prepaidPeriods}
                    onChange={(e) => setPrepaidPeriods(e.target.value)}
                  />
                </label>
              ) : null}
              {recordPayment ? (
                <label className={styles.field}>
                  <span>Utalás azonosítója</span>
                  <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="a bankkivonatról" autoComplete="off" />
                </label>
              ) : null}
            </div>

            <p className={styles.hint}>
              {billingInterval === "year"
                ? `Éves fizetésnél ide írd a ténylegesen alkudott árat. Üresen hagyva a nyilvános éves ár érvényes (${listPerCycle ? formatHuf(listPerCycle) : "a havidíj tízszerese"}, 2 hónap kedvezménnyel).`
                : "Üresen hagyva a havidíj az irányadó. Akkor töltsd ki, ha a ciklusdíj eltér tőle."}
            </p>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={recordPayment} onChange={(e) => setRecordPayment(e.target.checked)} />
              <div>
                <strong>A befizetés már megtörtént</strong>
                <small>
                  Rögzítünk egy teljesített befizetést, és ettől számoljuk a következő esedékességet.
                  Ha egyszerre több időszakot fizetett (pl. két évet vagy három hónapot), állítsd be a
                  ciklusszámot — addig nem kap fizetési emlékeztetőt. Vedd ki a pipát, ha még nem fizetett.
                </small>
              </div>
            </label>
          </div>

          {/* ── 4. Hova számlázunk ──────────────────────────────────────── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>4 · Számlázási adatok</div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Számlázási név</span>
                <input type="text" value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder={company || fullName || "Példa Kft."} autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Adószám</span>
                <input type="text" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} placeholder="12345678-1-42" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Irányítószám</span>
                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="1051" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Település</span>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Budapest" autoComplete="off" />
              </label>
              <label className={styles.field}>
                <span>Utca, házszám</span>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Fő utca 1." autoComplete="off" />
              </label>
            </div>
            <p className={styles.hint}>
              Ezek nélkül a Billingo-számla nem állítható ki. Később is pótolhatók, de akkor a befizetés
              addig számlázatlan marad.
            </p>
          </div>

          {/* ── 5. Egyéb ────────────────────────────────────────────────── */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>5 · Nyilvántartás</div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Honnan jött</span>
                <select value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)}>
                  <option value="cold_email">Hideg email kampány</option>
                  <option value="manual">Egyéb (ajánlás, telefon)</option>
                </select>
              </label>
            </div>
            <label className={styles.field}>
              <span>Belső jegyzet</span>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Miben állapodtatok meg, mi a helyzet vele. Ezt az ügyfél nem látja." />
            </label>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={sendInvite} onChange={(e) => setSendInvite(e.target.checked)} />
              <div>
                <strong>Meghívó küldése most</strong>
                <small>Kap egy levelet, amivel jelszót állít magának. Enélkül a fiók létrejön, de belépni nem tud.</small>
              </div>
            </label>

            <label className={styles.checkRow}>
              <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
              <div>
                <strong>Hozzájárult a hírlevélhez</strong>
                <small>
                  Csak akkor pipáld be, ha tényleg kérte. A szolgáltatáshoz tartozó levelek (számla,
                  havi jelentés, fizetési emlékeztető) ettől függetlenül mennek neki.
                </small>
              </div>
            </label>
          </div>
        </div>

        {/* ── Élő előnézet ──────────────────────────────────────────────── */}
        <aside className={styles.preview}>
          <div className={styles.previewHead}>
            <strong>Ezt fogja látni</strong>
            <small>Az ügyfélkapu menedzselt nézete</small>
          </div>

          <div className={styles.previewRows}>
            <div className={styles.previewRow}>
              <span>Weboldal</span>
              <b>{domain || projectTitle || "—"}</b>
            </div>
            <div className={styles.previewRow}>
              <span>Csomag</span>
              <b>{plan.name}</b>
            </div>
            <div className={styles.previewRow}>
              <span>Díj</span>
              <b>{priceValid ? `${formatHuf(price)} / hó` : "—"}</b>
            </div>
            {billingInterval === "year" ? (
              <div className={styles.previewRow}>
                <span>Egy évre fizet</span>
                <b>{perCycle ? formatHuf(perCycle) : "—"}</b>
              </div>
            ) : null}
            {discount ? (
              <div className={styles.previewRow}>
                <span>Kedvezmény</span>
                <b>{formatHuf(discount.saved)} · {discount.months} hónap</b>
              </div>
            ) : null}
            {recordPayment && periodCount > 1 ? (
              <div className={styles.previewRow}>
                <span>Most befizetett</span>
                <b>{paidAmount ? `${formatHuf(paidAmount)} · ${periodCount} ${billingInterval === "year" ? "év" : "hónap"}` : "—"}</b>
              </div>
            ) : null}
            {recordPayment && schedule ? (
              <div className={styles.previewRow}>
                <span>Kifizetve eddig</span>
                <b>{new Date(schedule.prepaidUntil).toLocaleDateString("hu-HU")}</b>
              </div>
            ) : null}
            <div className={styles.previewRow}>
              <span>Következő esedékesség</span>
              <b>{schedule ? new Date(schedule.nextBillingAt).toLocaleDateString("hu-HU") : "—"}</b>
            </div>
            <div className={styles.previewRow}>
              <span>Módosítási keret</span>
              <b>{plan.changeQuota.count} / {plan.changeQuota.period === "year" ? "év" : "hó"}</b>
            </div>
            <div className={styles.previewRow}>
              <span>Fizetés</span>
              <b>{paymentMethod === "stripe" ? "Bankkártya" : "Banki átutalás"}</b>
            </div>
          </div>

          {schedule && recordPayment && nowMs > 0 && new Date(schedule.prepaidUntil).getTime() < nowMs ? (
            <p className={`${styles.previewNote} ${styles.warn}`}>
              Az utolsó befizetés által fedezett időszak <b>{new Date(schedule.prepaidUntil).toLocaleDateString("hu-HU")}</b>-n
              lejárt, tehát ez az ügyfél jelenleg késésben van. A felvétel után rögtön esedékes nála egy fizetés.
            </p>
          ) : null}

          {discount ? (
            <p className={styles.previewNote}>
              A(z) {formatHuf(discount.list)} listaár helyett {formatHuf(discount.actual)} — ez{" "}
              {discount.months} havidíjnyi kedvezmény. Az ügyfél ezt a megállapodásán is látni fogja,
              és a számla is a ténylegesen fizetett összegről szól.
            </p>
          ) : null}

          {paymentMethod === "bank_transfer" ? (
            <p className={styles.previewNote}>
              Utalásnál a Stripe számlázási felülete helyett a banki adataidat és az esedékességet látja.
              A beérkezett utalást neked kell rögzítened a projekt „Befizetés rögzítése" gombjával.
            </p>
          ) : (
            <p className={styles.previewNote}>
              Kártyás fizetésnél a felvétel után a projektnél tudsz fizetési linket generálni, amit
              bemásolhatsz neki egy levélbe.
            </p>
          )}
        </aside>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <footer className={styles.footer}>
        <span className={styles.hint}>A csillaggal jelölt mezők kötelezők.</span>
        <div className={styles.actions}>
          <button className="admin-btn-secondary" type="button" onClick={onClose} disabled={busy}>Mégsem</button>
          <button className="admin-btn-primary" type="submit" disabled={busy}>
            {busy ? "Felvétel folyamatban…" : "Ügyfél felvétele"}
          </button>
        </div>
      </footer>
    </form>
  );
}
