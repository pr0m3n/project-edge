/**
 * Egy fodrászszalon hete — three.js nélkül, hogy a 3D naptár és a
 * számlálók (foglalások, kihasználtság, bevétel) ugyanabból dolgozzanak.
 * Determinisztikus: minden betöltésnél ugyanaz a hét.
 */

export const DAYS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
export const DAY_SHORT = ["H", "K", "SZE", "CS", "P", "SZO"];
export const OPEN = 9;
/** Zárás naponta (szombaton rövidebb nap). */
export const CLOSE = [19, 19, 19, 19, 19, 14];

export type Service = { name: string; hours: number; price: number; tone: "coral" | "lime" | "blue" };

export const SERVICES: Service[] = [
  { name: "Vágás", hours: 1, price: 9900, tone: "coral" },
  { name: "Festés", hours: 2, price: 24900, tone: "lime" },
  { name: "Balayage", hours: 3, price: 42000, tone: "lime" },
  { name: "Szakáll", hours: 0.5, price: 4900, tone: "blue" },
  { name: "Vágás + szakáll", hours: 1.5, price: 13900, tone: "blue" },
  { name: "Hajkezelés", hours: 1, price: 12900, tone: "coral" }
];

const NAMES = ["Nóra", "Júlia", "Márk", "Anna", "Bence", "Dóra", "Levente", "Eszter", "Kata", "Zsófi", "Ádám", "Réka", "Gergő", "Lili", "Tamás", "Vivien", "Máté", "Petra", "Dani", "Emese", "Kristóf", "Hanna", "Olivér", "Fanni", "Botond", "Luca", "Noémi", "Áron", "Dorina", "Soma", "Ildikó", "Balázs", "Krisztina", "Zoli", "Bianka", "Péter", "Sára", "Gábor", "Flóra", "Ákos"];

export type Booking = {
  id: number;
  day: number;
  start: number;
  service: Service;
  name: string;
  /** Mikor esik be a görgetésben (0..1). */
  arrive: number;
  /** A foglalás „valódi" időpontja, a feliratnak. */
  bookedAt: string;
};

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const rand = random(11);
const list: Omit<Booking, "arrive" | "bookedAt">[] = [];
for (let day = 0; day < DAYS.length; day++) {
  let time = OPEN;
  while (time < CLOSE[day]) {
    // ebédszünet hétköznap 13:00-kor
    if (day < 5 && time >= 13 && time < 13.5) {
      time = 13.5;
      continue;
    }
    // néha marad egy félórás rés
    if (rand() < 0.14) time += 0.5;
    const fits = SERVICES.filter((service) => time + service.hours <= CLOSE[day] && !(day < 5 && time < 13 && time + service.hours > 13));
    if (!fits.length) break;
    const service = fits[Math.floor(rand() * fits.length)];
    list.push({ day, id: list.length, name: NAMES[list.length % NAMES.length], service, start: time });
    time += service.hours;
  }
}

const TIMES = ["H 07:12", "H 21:48", "K 06:55", "K 23:41", "SZE 00:17", "SZE 12:30", "CS 22:05", "P 05:40", "V 20:12", "V 23:58"];
const order = list.map((_, index) => index).sort(() => rand() - 0.5);

export const BOOKINGS: Booking[] = list.map((booking) => {
  const rank = order.indexOf(booking.id);
  return {
    ...booking,
    arrive: 0.13 + (rank / list.length) * 0.32,
    bookedAt: TIMES[rank % TIMES.length]
  };
});

/** A lemondott foglalás: csütörtök délután, egy festés. */
export const CANCELLED = BOOKINGS.find((booking) => booking.day === 3 && booking.start >= 13.5 && booking.service.hours >= 1) ?? BOOKINGS[0];
/** A várólistáról érkező vendég ugyanarra a helyre. */
export const WAITLIST: Booking = { ...CANCELLED, arrive: 0.7, bookedAt: "CS 11:04", id: BOOKINGS.length, name: "Kata" };

export const OPEN_HOURS = CLOSE.reduce((sum, close, day) => sum + close - OPEN - (day < 5 ? 0.5 : 0), 0);

export function stats(progress: number) {
  let count = 0;
  let hours = 0;
  let revenue = 0;
  for (const booking of BOOKINGS) {
    if (progress < booking.arrive) continue;
    if (booking === CANCELLED && progress >= 0.64) continue;
    count++;
    hours += booking.service.hours;
    revenue += booking.service.price;
  }
  if (progress >= WAITLIST.arrive) {
    count++;
    hours += WAITLIST.service.hours;
    revenue += WAITLIST.service.price;
  }
  return { count, occupancy: hours / OPEN_HOURS, revenue };
}

export const formatHour = (hour: number) => `${Math.floor(hour)}:${hour % 1 ? "30" : "00"}`;
export const formatFt = (value: number) => `${Math.round(value).toLocaleString("hu-HU")} Ft`;
