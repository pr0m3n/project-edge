"use client";

import { FormEvent, useState } from "react";

export function Newsletter() {
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDone(true);
  };

  return (
    <form className="zm-newsletter-form" onSubmit={onSubmit}>
      {done ? (
        <p className="zm-newsletter-done">
          Köszönjük! (Mintaprojekt — valódi feliratkozás nem történt.)
        </p>
      ) : (
        <>
          <input
            aria-label="Email cím"
            name="email"
            placeholder="te@email.hu"
            required
            type="email"
          />
          <button className="zm-btn" type="submit">
            Kérem a 10%-ot
          </button>
        </>
      )}
    </form>
  );
}
