"use client";

import type { ReactNode } from "react";

type ContactButtonProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function ContactButton({ children, className, onClick }: ContactButtonProps) {
  function openContact() {
    onClick?.();
    window.dispatchEvent(
      new CustomEvent("projectedge:open-support", {
        detail: {
          message: "Szeretnék egy rövid weboldal-áttekintést kérni. A weboldalam címe: "
        }
      })
    );
  }

  return (
    <button className={className} onClick={openContact} type="button">
      {children}
    </button>
  );
}
