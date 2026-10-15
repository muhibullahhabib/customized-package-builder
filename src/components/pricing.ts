// @ts-nocheck
// pricing.ts: all prices and business rules in one place.
// Service and package numbers are PLACEHOLDERS; replace them with the real prices.
import { DESTINATIONS } from "./villas";

export const TIER_LABELS = { "4-6": "4–6 bedrooms", "7-9": "7–9 bedrooms", "10-12": "10–12 bedrooms", "13+": "13 or more bedrooms" };

// pricing basis: "day" = per day, "person" = per guest, "flat" = flat fee per booking
export const SERVICES = [
  { id: "chef", name: "Chef", basis: "day", price: 350 },
  { id: "transport", name: "Transportation / Chauffeur", basis: "day", price: 400 },
  { id: "atv", name: "ATV / Zipline", basis: "person", price: 120 },
  { id: "massage", name: "Massage", basis: "person", price: 150 },
  { id: "yacht", name: "Yacht", basis: "flat", price: 2500 },
];

// Packages: price per guest + which services are included (confirm package contents with the client)
export const PACKAGES = {
  silver: { label: "Silver", tagline: "Core trip essentials", perPerson: 250, includes: ["chef"] },
  gold: { label: "Gold", tagline: "More included experiences", perPerson: 450, popular: true, includes: ["chef", "transport", "massage"] },
  platinum: { label: "Platinum", tagline: "Premium trip selection", perPerson: 800, includes: ["chef", "transport", "massage", "atv", "yacht"] },
};

export const RULES = {
  // The estimate is based on the guest's FIRST-CHOICE villa (per the client's "Before You Pay" wording).
  // "first-choice" = price of the 1st-choice villa. "highest-ranked" = the higher price of the 1st and 2nd choice.
  accommodationPriceRule: "first-choice",
  depositPct: 0.5,          // provisional deposit = 50% of accommodation + 50% of yacht
  balanceDueDaysBefore: 30, // balance is due 30 days before check-in
  // ⚠️ Not decided by the client yet; these are the working defaults:
  servicesOnlyPayFullNow: true, // services-only bookings (no villa) are paid 100% now
  withinWindowPayFullNow: false, // trips starting within 30 days: false = still the normal deposit now, and the
                                 // payment required is stated before final confirmation (matches the client's wording)
};

const usdN = (n) => "$" + n.toLocaleString("en-US");
const money = (n) => Math.round(n * 100) / 100;
const dayMs = 86400000;

export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const n = Math.round((new Date(checkOut) - new Date(checkIn)) / dayMs);
  return n > 0 ? n : 0;
}

/**
 * state = {
 *   mode: "stay" | "services",
 *   destination: "dr" | "cartagena" | "dest1",
 *   checkIn, checkOut, guests,
 *   tier: "4-6",
 *   ranks: { villaId: "1" | "2" },
 *   package: "silver" | "gold" | "platinum" | null,
 *   services: { chef: qty, atv: qty, yacht: 1, ... }   // qty > 0 means selected
 * }
 */
export function calculate(state) {
  const nights = nightsBetween(state.checkIn, state.checkOut);
  const guests = Math.floor(Number(state.guests)) || 0;
  const lines = [];
  let accommodation = 0;
  let yacht = 0;
  let estimated = false;
  let firstChoice = null;
  let priceTbd = false; // true when the guest's 1st-choice villa has no price yet

  if (state.mode === "stay" && nights > 0) {
    const villas = DESTINATIONS[state.destination]?.tiers[state.tier] || [];
    const first = villas.find((v) => state.ranks?.[v.id] === "1");
    const second = villas.find((v) => state.ranks?.[v.id] === "2");
    const priced = villas.filter((v) => v.nightly > 0);
    let nightly = 0;
    if (first) firstChoice = first.name;
    if (first && first.nightly > 0) {
      nightly = RULES.accommodationPriceRule === "highest-ranked" && second && second.nightly > 0 ? Math.max(first.nightly, second.nightly) : first.nightly;
    } else if (priced.length) {
      nightly = Math.min(...priced.map((v) => v.nightly)); // no priced 1st choice yet: show the lowest price in the tier as "from"
      estimated = true;
      priceTbd = !!first; // the guest did choose a villa, but its price is not available
    }
    accommodation = nightly * nights;
    if (accommodation) {
      const label = first && !estimated ? `${first.name} (1st choice)` : `${TIER_LABELS[state.tier]} tier (from)`;
      lines.push({ label: `${label} · ${usdN(nightly)} × ${nights} night${nights > 1 ? "s" : ""}`, amount: accommodation });
    }
  }

  const pkg = state.package ? PACKAGES[state.package] : null;
  if (pkg && guests > 0) {
    lines.push({ label: `${pkg.label} package × ${guests} guest${guests > 1 ? "s" : ""}`, amount: pkg.perPerson * guests });
  }

  // services included in the package are not charged twice
  const covered = new Set(pkg ? pkg.includes : []);
  for (const s of SERVICES) {
    const qty = Number(state.services?.[s.id]) || 0;
    if (qty <= 0 || covered.has(s.id)) continue;
    const amount = s.basis === "flat" ? s.price : s.price * qty;
    const unit = s.basis === "day" ? `${qty} day${qty > 1 ? "s" : ""}` : s.basis === "person" ? `${qty} guest${qty > 1 ? "s" : ""}` : "flat fee";
    lines.push({ label: `${s.name} · ${unit}`, amount });
    if (s.id === "yacht") yacht += amount;
  }
  // a yacht included in a package also counts toward the deposit
  if (pkg && pkg.includes.includes("yacht")) yacht += SERVICES.find((s) => s.id === "yacht").price;

  const total = money(lines.reduce((t, l) => t + l.amount, 0));

  // deposit and balance
  const daysToTrip = state.checkIn ? Math.ceil((new Date(state.checkIn) - Date.now()) / dayMs) : null;
  const dueDate = state.checkIn ? new Date(new Date(state.checkIn) - RULES.balanceDueDaysBefore * dayMs) : null;
  let deposit = money((accommodation + yacht) * RULES.depositPct);
  let policy = "standard";

  if (state.mode === "services") {
    policy = "services-only";
    if (RULES.servicesOnlyPayFullNow) deposit = total;
  } else if (daysToTrip !== null && daysToTrip <= RULES.balanceDueDaysBefore) {
    policy = "within-window";
    if (RULES.withinWindowPayFullNow) deposit = total;
  }

  return {
    nights, lines, total, estimated, priceTbd, firstChoice, deposit, policy,
    balance: money(total - deposit),
    balanceDueDate: policy === "standard" && dueDate ? dueDate.toISOString().slice(0, 10) : null,
  };
}