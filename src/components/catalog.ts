// @ts-nocheck
// catalog.ts: the shape of the "catalog" (all prices, villas, services, packages and rules).
//
// In production the catalog comes from the backend (GET request), which builds it from the CMS tables that the
// owner edits. DEFAULT_CATALOG below is only used (1) while CATALOG_URL is empty (local development) and
// (2) as the source for the seed files that fill the CMS the first time.
import { DESTINATIONS } from "./villas";

export const DEFAULT_CATALOG = {
  version: "default",          // the backend sends the time of the last CMS change here
  currency: "USD",
  rules: {
    accommodationPriceRule: "first-choice", // "first-choice" or "highest-ranked" (higher of the 1st and 2nd choice)
    depositPct: 0.5,                        // provisional deposit = 50% of (accommodation + deposit-eligible services)
    balanceDueDaysBefore: 30,
    servicesOnlyPayFullNow: true,           // ⚠️ not decided by the client yet
    withinWindowPayFullNow: false,          // ⚠️ not decided by the client yet
  },
  tierLabels: { "4-6": "4–6 bedrooms", "7-9": "7–9 bedrooms", "10-12": "10–12 bedrooms", "13+": "13 or more bedrooms" },
  destinations: Object.entries(DESTINATIONS).map(([id, d]) => ({ id, name: d.name, tiers: d.tiers })),
  // basis: "day" = per day, "person" = per guest, "flat" = flat fee per booking.
  // inDeposit: true = counts toward the deposit (the yacht). ⚠️ Service prices are PLACEHOLDERS.
  services: [
    { id: "chef", name: "Chef", basis: "day", price: 350 },
    { id: "transport", name: "Transportation / Chauffeur", basis: "day", price: 400 },
    { id: "atv", name: "ATV / Zipline", basis: "person", price: 120 },
    { id: "massage", name: "Massage", basis: "person", price: 150 },
    { id: "yacht", name: "Yacht", basis: "flat", price: 2500, inDeposit: true },
  ],
  // ⚠️ Package contents and prices are PLACEHOLDERS (to be confirmed with the client).
  packages: [
    { id: "silver", label: "Silver", tagline: "Core trip essentials", perPerson: 250, includes: ["chef"] },
    { id: "gold", label: "Gold", tagline: "More included experiences", perPerson: 450, popular: true, includes: ["chef", "transport", "massage"] },
    { id: "platinum", label: "Platinum", tagline: "Premium trip selection", perPerson: 800, includes: ["chef", "transport", "massage", "atv", "yacht"] },
  ],
};

const BASIS = ["day", "person", "flat"];
const num = (x) => (x === null || x === undefined || x === "" ? null : Number(x));

// Checks and cleans a catalog received from the backend. Throws an Error when the data is unusable,
// so the widget shows a "try again" message instead of showing wrong prices.
export function validateCatalog(raw) {
  const fail = (m) => { throw new Error("Invalid catalog: " + m); };
  if (!raw || typeof raw !== "object") fail("not an object");
  const r = raw.rules || {};
  const rules = {
    accommodationPriceRule: r.accommodationPriceRule === "highest-ranked" ? "highest-ranked" : "first-choice",
    depositPct: Number(r.depositPct),
    balanceDueDaysBefore: Number(r.balanceDueDaysBefore),
    servicesOnlyPayFullNow: !!r.servicesOnlyPayFullNow,
    withinWindowPayFullNow: !!r.withinWindowPayFullNow,
  };
  if (!(rules.depositPct > 0 && rules.depositPct <= 1)) fail("rules.depositPct");
  if (!(rules.balanceDueDaysBefore >= 0)) fail("rules.balanceDueDaysBefore");

  if (!raw.tierLabels || !Object.keys(raw.tierLabels).length) fail("tierLabels");
  if (!Array.isArray(raw.destinations) || !raw.destinations.length) fail("destinations");
  if (!Array.isArray(raw.services)) fail("services");
  if (!Array.isArray(raw.packages)) fail("packages");

  const destinations = raw.destinations.map((d) => {
    if (!d.id || !d.name || typeof d.tiers !== "object") fail("destination " + d.id);
    const tiers = {};
    for (const [tier, list] of Object.entries(d.tiers)) {
      if (!Array.isArray(list)) fail("tier " + tier);
      tiers[tier] = list.map((v) => {
        if (!v.id || !v.name) fail("villa without id or name in " + d.id);
        return {
          id: String(v.id), name: String(v.name), nightly: num(v.nightly),
          location: Number(v.location) || 0, luxury: Number(v.luxury) || 0, value: Number(v.value) || 0,
          maxGuests: num(v.maxGuests) || undefined, note: v.note || undefined, image: v.image || undefined,
          seasons: Array.isArray(v.seasons) ? v.seasons.filter((s) => /^\d\d-\d\d$/.test(s.start) && /^\d\d-\d\d$/.test(s.end) && Number(s.nightly) > 0).map((s) => ({ start: s.start, end: s.end, nightly: Number(s.nightly) })) : undefined,
        };
      });
    }
    return { id: String(d.id), name: String(d.name), tiers };
  });

  const services = raw.services.map((s) => {
    if (!s.id || !s.name || !BASIS.includes(s.basis) || !(Number(s.price) >= 0)) fail("service " + s.id);
    return { id: String(s.id), name: String(s.name), basis: s.basis, price: Number(s.price), inDeposit: !!s.inDeposit };
  });
  const ids = new Set(services.map((s) => s.id));
  const packages = raw.packages.map((p) => {
    if (!p.id || !p.label || !(Number(p.perPerson) >= 0)) fail("package " + p.id);
    return { id: String(p.id), label: String(p.label), tagline: p.tagline || "", perPerson: Number(p.perPerson), popular: !!p.popular, includes: (p.includes || []).filter((x) => ids.has(x)) };
  });

  return { version: String(raw.version || ""), currency: raw.currency || "USD", rules, tierLabels: raw.tierLabels, destinations, services, packages };
}