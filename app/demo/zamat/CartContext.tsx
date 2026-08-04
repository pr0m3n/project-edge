"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { findProduct, sizes } from "./data";

export type CartLine = {
  key: string;
  slug: string;
  size: string;
  grind: string;
  qty: number;
};

type CartValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  open: boolean;
  lastAdded: string | null;
  setOpen: (v: boolean) => void;
  add: (slug: string, size: string, grind: string, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

const CartCtx = createContext<CartValue | null>(null);

const STORAGE_KEY = "zamat-demo-cart";

export function linePrice(line: CartLine) {
  const product = findProduct(line.slug);
  const size = sizes.find((s) => s.id === line.size) ?? sizes[0];
  if (!product) return 0;
  return Math.round((product.price * size.multiplier) / 10) * 10;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) {
          setLines(parsed.filter((l) => findProduct(l.slug)));
        }
      }
    } catch {
      /* a demóban a hibás tárolt kosár nem érdekes, üresen indulunk */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* privát böngészés esetén nincs tárolás — nem gond */
    }
  }, [lines, hydrated]);

  const add = useCallback((slug: string, size: string, grind: string, qty = 1) => {
    const key = `${slug}|${size}|${grind}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + qty) } : l));
      }
      return [...prev, { key, slug, size, grind, qty }];
    });
    setLastAdded(key);
    setOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, qty: Math.min(20, qty) } : l))
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + linePrice(l) * l.qty, 0);
    return { lines, count, subtotal, open, lastAdded, setOpen, add, setQty, remove, clear };
  }, [lines, open, lastAdded, add, setQty, remove, clear]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart csak a CartProvider alatt használható");
  return ctx;
}
