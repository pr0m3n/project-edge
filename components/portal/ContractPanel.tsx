import type { Project } from "@/components/portal/types";
import { escHtml, formatPrice } from "@/components/portal/format";
import { PROVIDER, providerContractParty } from "@/lib/legal";
import { PRICE_TAX_NOTE, formatHuf, subscriptionPlan } from "@/lib/subscriptions";

type Props = { project: Project; contractChecked: boolean; onContractCheckedChange: (checked: boolean) => void; performanceConsent: boolean; onPerformanceConsentChange: (checked: boolean) => void; onAccept: () => void };

function sections(project: Project) {
  const managed = project.commercial_model === "subscription";
  const plan = subscriptionPlan(project.subscription_plan);
  const price = managed ? `${formatHuf(project.monthly_price ?? plan.price)} / hónap` : formatPrice(project.offer_price, project.offer_currency || "Ft");
  return [
    ["1", "A szerződés tárgya", managed
      ? `A Szolgáltató elkészíti, üzemelteti, technikailag felügyeli és a csomag keretei között karbantartja a „${project.title}” weboldalt. A szolgáltatás menedzselt hozzáférés, nem részletfizetéses adásvétel.`
      : `A Szolgáltató elkészíti a „${project.title}” egyedi weboldalt/digitális rendszert az elfogadott ajánlat és brief szerint.`],
    ["2", "Csomag és terjedelem", `${managed ? `${plan.name}: ${plan.short}.` : project.offer_scope || "Az elfogadott ajánlat szerint."} A csomagon kívüli funkció, teljes újratervezés vagy többletmunka külön írásos megrendelés tárgya.`],
    ["3", "Díj és fizetés", managed
      ? `Díj: ${price}, előre fizetve bankkártyával a Stripe biztonságos felületén. Nincs külön induló díj. Az első havidíj sikeres terhelése indítja a kivitelezést; a további díjakat a Stripe minden szolgáltatási időszak elején automatikusan terheli. A kártyaadatot a Szolgáltató nem tárolja. ${PRICE_TAX_NOTE}`
      : `Vállalási díj: ${price}. Foglaló: ${formatPrice(project.deposit_amount, project.offer_currency || "Ft")}; a fennmaradó díj jóváhagyás után, a teljes átadás előtt esedékes. ${PRICE_TAX_NOTE}`],
    ["4", "Határidő és együttműködés", `${project.offer_timeline || (managed ? "A kivitelezés ütemezése az első havidíj jóváírása és a szükséges anyagok hiánytalan átadása után indul." : "Az elfogadott ajánlat szerint.")} Az ügyfél késedelmes anyagátadása vagy visszajelzése a határidőt arányosan kitolja.`],
    ["5", "Domain és technikai infrastruktúra", managed
      ? `A kiválasztott domain regisztrációját, megújítását, tárhelyét, SSL-tanúsítványát és technikai fiókjait a Szolgáltató intézi és kezeli. Az ügyfél a rendezett előfizetés alatt kizárólagosan használhatja a domaint a saját márkájához. A domain és a technikai rendszer nem kerül automatikusan átadásra a szolgáltatás megszűnésekor.`
      : `A domain, hosting és külső szolgáltatások az ügyfél saját fiókjaiba kerülnek; folyamatos díjuk és megújításuk az ügyfelet terheli. Hozzáférésátadás csak a teljes díj rendezése után történik.`],
    ["6", "Szellemi tulajdon és tartalom", managed
      ? `Az ügyfél neve, márkája, logója, adatai és átadott tartalmai az ügyfélnél maradnak. A weboldal forráskódja, komponensei és technikai fiókjai feletti rendelkezési jog a Szolgáltatónál marad; az ügyfél a rendezett előfizetés idejére kap használati jogot.`
      : `A teljes díj megfizetésével az ügyfél időben és területileg korlátlan felhasználási jogot kap az egyedileg létrehozott, átadható munkarészekre. Harmadik fél elemeire azok saját licence irányadó.`],
    ["7", managed ? "Időtartam, szüneteltetés és felmondás" : "Átadás és hibajavítás", managed
      ? `A szerződés határozatlan időre jön létre, hűségidő nélkül. Bármely hónapban felmondható; a felmondás a folyó, kifizetett időszak végén hatályos. Szüneteltetés a mindenkori parkolási díj mellett kérhető. A weboldal külön vételáron megvásárolható, de a korábbi havidíjak nem vételárrészletek.`
      : `Az átadás az Ügyfélkapu vezetett folyamatában történik. Az utolsó igazolt technikai átadási lépéstől számított 30 napig a Szolgáltató díjmentesen kijavítja az átadáskor vállalt működés igazolt hibáit; ez nem terjed ki új funkcióra, új tartalomra vagy harmadik fél módosítására.`],
    ["8", "Fogyasztói nyilatkozat", `Fogyasztó ügyfél szolgáltatási szerződésnél 14 napon belül indokolás nélkül felmondhat. Ha külön kéri a teljesítés korábbi megkezdését, felmondáskor a már teljesített szolgáltatás arányos díját köteles megfizetni. A teljes szolgáltatás befejezésével a jog csak előzetes kifejezett kérés és tudomásulvétel mellett szűnik meg.`],
    ["9", "Felelősség, panasz és záró szabályok", `A felek együttműködnek és a másikat érintő körülményről késedelem nélkül tájékoztatnak. A Szolgáltató nem felel az ügyfél jogsértő tartalmáért vagy ellenőrzési körén kívüli szolgáltatáskiesésért, a kötelező jogszabályi felelősség korlátozása nélkül. Panasz: ${PROVIDER.email}. Az egyedi szerződés, az elfogadott brief és az ÁSZF együtt alkotja a megállapodást; eltérésnél az egyedi szerződés az elsődleges. Irányadó jog: magyar jog.`]
  ] as const;
}

export function contractPlainText(project: Project) {
  const title = project.commercial_model === "subscription" ? "MENEDZSELT WEBOLDAL-SZOLGÁLTATÁSI SZERZŐDÉS" : "EGYEDI VÁLLALKOZÁSI SZERZŐDÉS";
  return [title, `Verzió: 2026-08-09`, `Szolgáltató: ${providerContractParty()}`, `Ügyfél: ${project.company || project.contact_name || "Megrendelő"} (${project.contact_email})`, `Projekt: ${project.title}`, ...sections(project).map(([, sectionTitle, copy]) => `${sectionTitle}\n${copy}`), `Az ÁSZF elérhetősége: https://projectedge.hu/aszf`].join("\n\n");
}

function printContract(project: Project) {
  const win = window.open("", "_blank"); if (!win) return;
  const body = sections(project).map(([n, title, copy]) => `<section><b>${n.padStart(2, "0")}</b><div><h2>${escHtml(title)}</h2><p>${escHtml(copy)}</p></div></section>`).join("");
  win.document.write(`<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>Szerződés – ${escHtml(project.title)}</title><style>@page{margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#253039;line-height:1.55;margin:0}.cover{border-bottom:3px solid #76abae;padding-bottom:24px;margin-bottom:24px}.tag{color:#497f82;font-size:10px;letter-spacing:.16em;text-transform:uppercase}h1{font-size:28px;margin:8px 0}.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:11px}.meta div{background:#f4f7f7;padding:12px;border-radius:8px}section{display:grid;grid-template-columns:34px 1fr;gap:12px;border-top:1px solid #dfe6e7;padding:16px 0;break-inside:avoid}section>b{color:#76abae}h2{font-size:14px;margin:0 0 4px}p{font-size:11px;margin:0}.foot{font-size:10px;margin-top:28px;color:#68757c}</style></head><body><div class="cover"><span class="tag">ProjectEdge · elektronikus szerződés</span><h1>${project.commercial_model === "subscription" ? "Menedzselt weboldal-szolgáltatási szerződés" : "Egyedi vállalkozási szerződés"}</h1><div class="meta"><div><strong>Szolgáltató</strong><br>${escHtml(providerContractParty())}</div><div><strong>Ügyfél</strong><br>${escHtml(project.company || project.contact_name || "Megrendelő")}<br>${escHtml(project.contact_email)}</div></div></div>${body}<p class="foot">Létrehozva: ${new Date().toLocaleString("hu-HU")} · Elektronikus elfogadáskor a rendszer időbélyeget rögzít. Az ÁSZF a szerződés része.</p><script>window.print();<\/script></body></html>`);
  win.document.close();
}

export function ContractPanel({ project, contractChecked, onContractCheckedChange, performanceConsent, onPerformanceConsentChange, onAccept }: Props) {
  const managed = project.commercial_model === "subscription"; const plan = subscriptionPlan(project.subscription_plan);
  return <article className="contract-document">
    <header className="contract-cover"><div><span className="contract-kicker">PROJECTEDGE · SZERZŐDÉS</span><h3>{managed ? "Menedzselt weboldal-szolgáltatás" : "Egyedi vállalkozási szerződés"}</h3><p>Átlátható feltételek, egy helyen. Elfogadás előtt a teljes dokumentum nyomtatható.</p></div><div className="contract-seal"><span>{managed ? plan.name : "EGYEDI"}</span><strong>{managed ? formatHuf(project.monthly_price ?? plan.price) : formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong><small>{managed ? "havonta" : "vállalási díj"}</small></div></header>
    <div className="contract-parties"><div><span>Szolgáltató</span><strong>{PROVIDER.shortName}</strong><small>{PROVIDER.address}<br/>Kapcsolattartó: {PROVIDER.contactName}</small></div><div><span>Ügyfél</span><strong>{project.company || project.contact_name || "Megrendelő"}</strong><small>{project.contact_email}<br/>{project.title}</small></div></div>
    {/* Menedzselt konstrukcióban a „0 Ft induló díj" félreérthető volt: külön
        belépési díj tényleg nincs, de az első havidíjat előre kell fizetni.
        A kártya ezért azt mutatja, ami ténylegesen fizetendő induláskor. */}
    <div className="contract-highlights"><div><b>{managed ? formatHuf(project.monthly_price ?? plan.price) : formatPrice(project.deposit_amount, project.offer_currency || "Ft")}</b><span>{managed ? "első havidíj, más induló díj nincs" : "foglaló"}</span></div><div><b>{managed ? "Nincs" : "30 nap"}</b><span>{managed ? "hűségidő" : "hibajavítás"}</span></div><div><b>{managed ? "Teljes" : "Vezetett"}</b><span>{managed ? "technikai kezelés" : "átadás"}</span></div></div>
    <div className="contract-clauses">{sections(project).map(([n,title,copy]) => <section key={n}><b>{n.padStart(2,"0")}</b><div><h4>{title}</h4><p>{copy}</p></div></section>)}</div>
    <button className="contract-print" type="button" onClick={() => printContract(project)}>↗ Nyomtatható szerződés megnyitása</button>
    <div className="contract-consents"><label><input type="checkbox" checked={contractChecked} onChange={(e) => onContractCheckedChange(e.target.checked)}/><span><strong>Elolvastam és elfogadom</strong> az egyedi szerződést és a szerződés részét képező <a href="/aszf" target="_blank">ÁSZF-et</a>.</span></label><label><input type="checkbox" checked={performanceConsent} onChange={(e) => onPerformanceConsentChange(e.target.checked)}/><span><strong>Kifejezetten kérem a teljesítés megkezdését</strong> a 14 napos határidő lejárta előtt. Tudomásul veszem, hogy felmondáskor az addig teljesített szolgáltatás arányos díja fizetendő, és az egyszeri szolgáltatás teljes befejezésével – az előzetes kérésem alapján – a felmondási jogom megszűnik.</span></label></div>
    <div className="contract-sign"><div><span>Elektronikus elfogadás</span><small>Az időpontot a rendszer automatikusan rögzíti és e-mailben visszaigazolja.</small></div><button className="button primary" disabled={!contractChecked || !performanceConsent} type="button" onClick={onAccept}>{managed ? "Szerződés elfogadása — tovább a havidíjhoz" : "Szerződés elfogadása — tovább a foglalóhoz"}</button></div>
  </article>;
}
