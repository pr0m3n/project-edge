"use client";

import type { ReactNode } from "react";

type ContactButtonProps = {
  children: ReactNode;
  className?: string;
  intent?: "contact" | "review";
  onClick?: () => void;
};

export function ContactButton({ children, className, intent = "contact", onClick }: ContactButtonProps) {
  function openContact() {
    onClick?.();
    window.dispatchEvent(
      new CustomEvent("projectedge:open-support", {
        detail: { intent }
      })
    );
  }

  return (
    <button className={className} onClick={openContact} type="button">
      {children}
    </button>
  );
}
