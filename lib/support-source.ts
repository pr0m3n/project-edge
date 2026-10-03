/**
 * Honnan indult a beszélgetés. A `source` az adminban listaszűrő és címke,
 * ezért NEM vesszük át nyersen a klienstől: egy szabadszöveges érték oda
 * bármit be tudna írni a listába. Csak az itt felsorolt értékek élnek, minden
 * más az alapértelmezettre esik vissza.
 */
const TICKET_SOURCES = ["projectedge.hu", "gyorssav"] as const;
const DEFAULT_TICKET_SOURCE = TICKET_SOURCES[0];

export function ticketSource(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return (TICKET_SOURCES as readonly string[]).includes(candidate) ? candidate : DEFAULT_TICKET_SOURCE;
}
