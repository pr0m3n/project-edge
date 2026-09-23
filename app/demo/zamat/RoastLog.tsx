"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { findProduct } from "./data";
import { beanTemp, formatDay, formatMinute, formatTemp, roastDays } from "./roast";

/** A napló sorai: melyik pörkölési napon (0 = a legutóbbi) mi készült. */
const ROWS: { day: number; slug: string; lot?: string; batch: string; crack: number; status: string }[] = [
  { day: 0, slug: "etiopia-guji", batch: "11,4 kg", crack: 8.02, status: "Rendelhető" },
  { day: 0, slug: "brazil-cerrado", batch: "12,0 kg", crack: 7.93, status: "Rendelhető" },
  { day: 1, slug: "kolumbia-huila", batch: "12,0 kg", crack: 8.07, status: "Rendelhető" },
  { day: 1, slug: "kenya-nyeri", batch: "8,5 kg", crack: 7.97, status: "Utolsó 9 zacskó" },
  { day: 2, slug: "guatemala-antigua", batch: "12,0 kg", crack: 8.03, status: "Rendelhető" },
  { day: 2, slug: "etiopia-guji", lot: "ET-24-109", batch: "11,6 kg", crack: 8.05, status: "Elfogyott" }
];

/* A dátumok a látogató mai napjához igazodnak (az utolsó keddek és péntekek),
   így a napló sosem „avul el". A szerver nem tudja, mi a mai nap a
   látogatónál, ezért ott a dátum oszlop üres, és csak a böngésző tölti ki. */
const subscribe = () => () => {};
const today = () => new Date().toDateString();
const serverToday = () => "";

export function RoastLog() {
  const todayKey = useSyncExternalStore(subscribe, today, serverToday);
  const days = todayKey ? roastDays(new Date(todayKey), 3) : [];

  return (
    <div className="zm-log-wrap">
      <table className="zm-log">
        <thead>
          <tr>
            <th>Pörkölés napja</th>
            <th>Tétel</th>
            <th>Kávé</th>
            <th>Adag</th>
            <th>1. pattanás</th>
            <th>Kivétel</th>
            <th>Állapot</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, index) => {
            const product = findProduct(row.slug);
            if (!product?.drop) return null;
            return (
              <tr className={row.status === "Elfogyott" ? "is-out" : ""} key={index}>
                <td>{days[row.day] ? formatDay(days[row.day]) : "—"}</td>
                <td>{row.lot ?? product.lot}</td>
                <td>
                  <Link href={`/demo/zamat/termek/${product.slug}`}>{product.name}</Link>
                </td>
                <td>{row.batch}</td>
                <td>{formatMinute(row.crack)}</td>
                <td>
                  {formatMinute(product.drop)} · {formatTemp(beanTemp(product.drop))}
                </td>
                <td>{row.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
