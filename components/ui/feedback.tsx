"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/* ---------------------------------------------------------------------------
 * Toasts
 * ------------------------------------------------------------------------- */

export type ToastKind = "success" | "error" | "info";

export type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

let toastSeq = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback(
    (message: string, kind: ToastKind = "info", durationMs = 4000) => {
      const id = ++toastSeq;
      setToasts((current) => [...current, { id, kind, message }]);
      timers.current[id] = setTimeout(() => dismissToast(id), durationMs);
      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return { toasts, pushToast, dismissToast };
}

export function ToastStack({
  toasts,
  onDismiss
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`toast toast-${toast.kind}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="toast-dot" />
          <span className="toast-message">{toast.message}</span>
          <span className="toast-close" aria-hidden>
            ×
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Confirm dialog
 * ------------------------------------------------------------------------- */

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      if (state) {
        state.resolve(value);
        setState(null);
      }
    },
    [state]
  );

  const confirmModal = state ? (
    <div className="confirm-overlay" onClick={() => settle(false)}>
      <div
        className="confirm-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{state.title}</h3>
        {state.message ? <p>{state.message}</p> : null}
        <div className="confirm-actions">
          <button type="button" className="button secondary" onClick={() => settle(false)}>
            {state.cancelLabel || "Mégse"}
          </button>
          <button
            type="button"
            className={`button ${state.danger ? "confirm-danger" : "primary"}`}
            onClick={() => settle(true)}
          >
            {state.confirmLabel || "Megerősítés"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, confirmModal };
}

/* ---------------------------------------------------------------------------
 * Skeleton
 * ------------------------------------------------------------------------- */

export function Skeleton({
  height = 16,
  width = "100%",
  radius = 8,
  style
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="skeleton-shimmer"
      style={{ display: "block", height, width, borderRadius: radius, ...style }}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Online / offline detection
 * ------------------------------------------------------------------------- */

export function useOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      Nincs internetkapcsolat — a módosítások nem mentődnek, amíg vissza nem áll a kapcsolat.
    </div>
  );
}
