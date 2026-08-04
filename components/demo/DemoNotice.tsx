"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * A mintaprojektekben a regisztráció, belépés, kereső és pénztár nincs
 * élesítve. Ahelyett, hogy egy gomb csendben nem csinálna semmit, kiírjuk,
 * hogy miért — így a demó nem hat félkésznek.
 */
const NoticeContext = createContext<(message: string) => void>(() => {});

export function DemoNoticeProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <NoticeContext.Provider value={show}>
      {children}
      <div aria-live="polite" className={`demo-notice ${message ? "is-on" : ""}`}>
        <div className="demo-notice-inner">
          <span className="demo-notice-tag">Demó</span>
          <p>{message}</p>
        </div>
      </div>
    </NoticeContext.Provider>
  );
}

export function useDemoNotice() {
  return useContext(NoticeContext);
}
