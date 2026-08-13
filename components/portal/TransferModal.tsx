"use client";

import { useState } from "react";
import type { Project } from "@/components/portal/types";
import { BANK_TRANSFER_DETAILS, formatPrice, transferReference } from "@/components/portal/format";

/**
 * Banki utalás adatai az egyszeri (purchase) projektekhez.
 *
 * Az előfizetés a Stripe-on megy; ez a modál kizárólag a foglaló és a
 * hátralék átutalásához adja meg a számlaadatokat és a közleményt.
 * A „másolva" visszajelzés saját, lokális állapot — nincs értelme a
 * portál fő komponensében tartani.
 */
type TransferModalProps = {
  project: Project;
  paymentMode: "deposit" | "final";
  paymentError: string;
  transferAlreadyReported: boolean;
  onClose: () => void;
  onReportTransfer: (project: Project) => void | Promise<void>;
};

export function TransferModal({
  project,
  paymentMode,
  paymentError,
  transferAlreadyReported,
  onClose,
  onReportTransfer
}: TransferModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const payAmount = paymentMode === "final"
    ? (project.offer_price ?? 0) - (project.deposit_amount ?? 0)
    : (project.deposit_amount ?? 0);
  const payLabel = paymentMode === "final"
    ? "Hátralék"
    : project.commercial_model === "subscription"
      ? "Első havidíj"
      : "Foglaló";
  const reference = transferReference(project);

  async function copyValue(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1600);
    } catch {
      // vágólap API nem elérhető — a mező kézzel is kijelölhető
    }
  }

  const copyRow = (field: string, label: string, value: string, isLast = false) => (
    <div
      key={field}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '13px 0',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.07)'
      }}
    >
      <div style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
        <span style={{ fontSize: '10.5px', letterSpacing: '0.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.42)' }}>{label}</span>
        <strong style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: '14.5px', color: '#F5F5F5', letterSpacing: '0.3px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</strong>
      </div>
      <button
        type="button"
        onClick={() => copyValue(field, value)}
        style={{
          flexShrink: 0,
          background: copiedField === field ? 'rgba(118,171,174,0.18)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${copiedField === field ? 'rgba(118,171,174,0.45)' : 'rgba(255,255,255,0.12)'}`,
          color: copiedField === field ? '#76ABAE' : 'rgba(255,255,255,0.75)',
          borderRadius: '10px',
          padding: '7px 12px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        {copiedField === field ? 'Másolva ✓' : 'Másolás'}
      </button>
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#1C1E22', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', width: '100%', maxWidth: '460px', padding: '24px', color: '#F5F5F5', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'grid', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>Banki átutalás</span>
          <button type="button" onClick={() => onClose()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '20px', padding: 0 }}>×</button>
        </div>

        <div>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Fizetés a következő projektre:</span>
          <h3 style={{ margin: '4px 0 0 0', color: '#fff' }}>{project.title}</h3>
          <small style={{ color: 'rgba(255,255,255,0.4)' }}>{project.company || "Cégnév nélkül"}</small>
        </div>

        <div style={{ background: 'linear-gradient(160deg, rgba(118,171,174,0.16), rgba(118,171,174,0.02))', border: '1px solid rgba(118,171,174,0.28)', borderRadius: '18px', padding: '16px 20px', display: 'grid', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>Fizetendő összeg ({payLabel})</span>
          <strong style={{ fontSize: '30px', color: '#76ABAE', fontVariantNumeric: 'tabular-nums' }}>{formatPrice(payAmount, project.offer_currency || "Ft")}</strong>
        </div>

        {paymentError && (
          <div style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.2)', color: '#FF7676', padding: '12px', borderRadius: '12px', fontSize: '14px' }}>
            {paymentError}
          </div>
        )}

        <div style={{ background: '#15171B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '2px 18px' }}>
          {copyRow('name', 'Kedvezményezett', BANK_TRANSFER_DETAILS.name)}
          {copyRow('account', 'Belföldi számlaszám', BANK_TRANSFER_DETAILS.accountNumber)}
          {copyRow('iban', 'IBAN', BANK_TRANSFER_DETAILS.iban)}
          {copyRow('bic', 'BIC / SWIFT', BANK_TRANSFER_DETAILS.bic)}
          {copyRow('reference', 'Közlemény (fontos!)', reference, true)}
        </div>

        <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          A közlemény alapján tudom azonosítani az utalásod — mindig add meg. Belföldi utalás
          jellemzően perceken–pár órán belül megérkezik. Ha bármi elakad, írj az{" "}
          <a href="mailto:info@projectedge.hu" style={{ color: '#76ABAE' }}>info@projectedge.hu</a> címre.
        </p>

        <button
          type="button"
          disabled={transferAlreadyReported}
          onClick={() => onReportTransfer(project)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: transferAlreadyReported ? '#315f63' : '#FF5722', border: 'none', borderRadius: '12px', color: '#fff', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: transferAlreadyReported ? 'default' : 'pointer' }}
        >
          {transferAlreadyReported ? '✓ Utalás elküldése jelezve' : 'Elküldtem az utalást'}
        </button>
      </div>
    </div>
  );
}
