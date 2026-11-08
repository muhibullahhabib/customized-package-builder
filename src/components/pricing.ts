// @ts-nocheck
// pricing.ts: ALL prices and pricing rules, and the price calculation.
// The widget (what the guest sees) and the server (what Stripe charges) both use this same file,
// so the numbers always match.
//
// Services and tours have their own price list for each location (see REGIONS below).
// To change a price, edit the number in REGIONS and nothing else.
//
// ⚠️ Silver / Gold / Platinum package prices are still the old PLACEHOLDERS. Replace them when the client sends the final rates.
import { DESTINATIONS } from "./villas";

export const TIER_LABELS = { "4-6": "4–6 bedrooms", "7-9": "7–9 bedrooms", "10-12": "10–12 bedrooms", "13+": "13 or more bedrooms" };

// ------------------------------------------------------------------------------------------------
// SERVICES AND TOURS, PER LOCATION
//
// basis:  "day"    = per day                     "person" = per guest
//         "flat"   = one fee per booking         "trip"   = per round trip (one vehicle, up to 10 guests)
//         "unit"   = each (models, DJ, ...)      "hour"   = per hour
//         "group"  = per group of up to 10 guests
// tab:    "regular"  = services offered everywhere     "location" = tours / experiences of this place only
// group:  used by the packages (a package covers every service of the groups it includes)
// tiers:  price depends on the group size, e.g. the chef. The first tier whose "upTo" fits the guest count wins.
// extra:  flat fee plus a price per guest above a number of guests (catamarans)
// freeWithStay: free when a villa / accommodation is booked as well (the host)
// pkg:    true = this is the boat that a Platinum package includes in this location
// A service with price: null is hidden until the client sends its price.
// ------------------------------------------------------------------------------------------------
const regular = (o) => [
  { id: "chef", name: "Chef", group: "chef", basis: "day", tab: "regular",
    tiers: [{ upTo: 10, price: o.chef[0] }, { price: o.chef[1], note: "with assistant" }] },
  { id: "transfer", name: "Airport transfer", group: "transfer", basis: "trip", tab: "regular", price: o.transfer, note: "up to 10 guests" },
  { id: "chauffeur", name: "Chauffeur (15-passenger van)", group: "transport", basis: "day", tab: "regular", price: o.chauffeur },
  { id: "massage", name: "Massage", group: "massage", basis: "person", tab: "regular", price: o.massage },
  { id: "host", name: "Host", group: "host", basis: "flat", tab: "regular", price: 100, freeWithStay: true },
  { id: "sushi", name: "Sushi model", group: "sushi", basis: "unit", tab: "regular", price: 250 },
  { id: "welcome", name: "Welcome model", group: "welcome", basis: "unit", tab: "regular", price: o.welcome },
  { id: "dj", name: "DJ / Bartender", group: "dj", basis: "unit", tab: "regular", price: o.dj },
  { id: "lingerie", name: "Lingerie waitress", group: "lingerie", basis: "hour", tab: "regular", price: 200 },
  { id: "vip", name: "VIP nightclub", group: "vip", basis: "group", tab: "regular", price: o.vip, note: "up to 10 people, 2 bottles" },
];

const loc = (id, name, basis, price, more = {}) => ({ id, name, group: more.group || id, basis, price, tab: "location", ...more });

export const REGIONS = {
  medellin: {
    label: "Medellín",
    services: [
      ...regular({ chef: [225, 275], transfer: 225, chauffeur: 250, massage: 79, welcome: 150, dj: 550, vip: 750 }),
      loc("guatape", "Guatape boat party (includes transportation)", "flat", 1000, { group: "yacht", pkg: true }),
      loc("atv", "ATV", "person", 130),
      loc("comuna", "Comuna tour", "person", 70),
      loc("paintball", "Paintball experience", "person", 125),
      loc("escobar", "Escobar tour", "person", 80),
    ],
  },
  "dominican-republic": {
    label: "Dominican Republic",
    services: [
      ...regular({ chef: [225, 275], transfer: 195, chauffeur: 295, massage: 79, welcome: 150, dj: 550, vip: 750 }),
      loc("atv", "ATV", "person", 90),
      loc("zip", "Zipline", "person", 90),
      loc("hike", "Mini hike and waterfall tour", "person", 90),
    ],
  },
  jaco: {
    label: "Jaco",
    services: [
      ...regular({ chef: [225, 325], transfer: 395, chauffeur: 295, massage: 85, welcome: 200, dj: 550, vip: 750 }),
      loc("yacht-party", "Yacht party (up to 15 people)", "flat", 2050, { group: "yacht", pkg: true }),
      loc("atv", "ATV", "person", 109),
      loc("zip", "Zipline tour", "person", 85),
      loc("manuel-antonio", "Manuel Antonio and monkey tour", "person", 120),
      loc("rafting", "White water rafting", "person", 170),
    ],
  },
  cartagena: {
    label: "Cartagena",
    services: [
      // chauffeur and VIP nightclub: price not received yet, so they stay hidden
      ...regular({ chef: [225, 275], transfer: 125, chauffeur: null, massage: 79, welcome: 150, dj: 425, vip: null }),
      loc("cat-51", "Catamaran 51 ft (up to 15 people)", "flat", 3195, { group: "yacht", extra: { after: 15, perPerson: 30 } }),
      // ⚠️ confirm with the client which boat the Platinum package includes in Cartagena
      loc("cat-47", "Catamaran 47 ft (up to 15 people)", "flat", 2995, { group: "yacht", pkg: true, extra: { after: 15, perPerson: 30 } }),
      loc("yacht-70", "Yacht 70 ft", "flat", 3750, { group: "yacht" }),
      loc("yacht-82", "Yacht 82 ft", "flat", 6000, { group: "yacht" }),
      loc("speedboat", "Speed boats", "flat", 1195, { group: "yacht" }),
      loc("atv", "ATV", "person", 139),
      loc("zip", "Zipline", "person", 139),
      loc("rum-cigar", "Rum and cigar experience", "person", 150),
      loc("fire-dancer", "Exotic fire dancer", "unit", 350),
    ],
  },
};

// Which price list each destination uses. A destination that is not listed here is matched by its name below.
const REGION_BY_DESTINATION = {
  medellin: "medellin",
  cartagena: "cartagena",
  sosua: "dominican-republic",
  "cap-cana-casa-de-campo": "dominican-republic",
  jaco: "jaco",
};

const plain = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function regionFor(destinationId) {
  if (REGION_BY_DESTINATION[destinationId]) return REGION_BY_DESTINATION[destinationId];
  const name = plain(DESTINATIONS[destinationId]?.name || destinationId);
  if (name.includes("dominican")) return "dominican-republic";
  if (name.includes("costa rica") || name.includes("jaco")) return "jaco";
  if (name.includes("medellin")) return "medellin";
  if (name.includes("cartagena")) return "cartagena";
  return null;
}

export const regionLabel = (destinationId) => REGIONS[regionFor(destinationId)]?.label || "";

const hasPrice = (s) => (s.tiers ? s.tiers.some((t) => t.price > 0) : s.price > 0 || s.freeWithStay);

// The services available for a destination (those without a price are left out)
export function servicesFor(destinationId) {
  const r = REGIONS[regionFor(destinationId)];
  return r ? r.services.filter(hasPrice) : [];
}

// Packages: price per guest + which service GROUPS are included (confirm package contents with the client).
// A package is charged once. The services inside it are never charged again, and the planning fee
// is calculated once on the package price.
export const PACKAGES = {
  silver: { label: "Silver", tagline: "Core trip essentials", perPerson: 250, includes: ["chef"] },
  gold: { label: "Gold", tagline: "More included experiences", perPerson: 450, popular: true, includes: ["chef", "transport", "massage"] },
  platinum: { label: "Platinum", tagline: "Premium trip selection", perPerson: 800, includes: ["chef", "transport", "massage", "atv", "yacht"] },
};

// Is this service already paid for by the package? (a package boat only covers the boat marked pkg)
export const isCovered = (svc, pkg) => !!pkg && pkg.includes.includes(svc.group) && (svc.group !== "yacht" || !!svc.pkg);

export const RULES = {
  // The estimate is based on the guest's FIRST-CHOICE villa (per the client's "Before You Pay" wording).
  // "first-choice" = price of the 1st-choice villa. "highest-ranked" = the higher price of the 1st and 2nd choice.
  accommodationPriceRule: "first-choice",

  // Guys Paradise Planning & Service Fee: a percentage of the subtotal of the selected accommodation,
  // package, tours and services. It also applies to services-only bookings. Taxes, payment-processing fees
  // and refundable security deposits are NOT part of the subtotal (the builder has none of them).
  serviceFeePct: 0.135,

  depositPct: 0.5,          // provisional deposit = 50% of accommodation + 50% of yacht
  // ⚠️ To confirm with the client: true  = the planning fee on the accommodation and yacht is split the same way
  //                                         (deposit = 50% of (accommodation + yacht) including its fee)
  //                               false = the whole fee is paid with the balance
  depositIncludesFee: true,
  balanceDueDaysBefore: 30, // balance is due 30 days before check-in
  // ⚠️ Not decided by the client yet; these are the working defaults:
  servicesOnlyPayFullNow: true,  // services-only bookings (no villa) are paid 100% now
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

const guestCount = (state) => Math.floor(Number(state.guests)) || 0;

// Unit price of one service for this group size (chef tiers, catamaran extra guests, free host with a stay)
export function unitPrice(svc, state) {
  const guests = guestCount(state);
  if (svc.freeWithStay && state.mode === "stay" && nightsBetween(state.checkIn, state.checkOut) > 0) return 0;
  if (svc.tiers) {
    const t = svc.tiers.find((x) => !x.upTo || guests <= x.upTo) || svc.tiers[svc.tiers.length - 1];
    return t.price;
  }
  let p = svc.price;
  if (svc.extra && guests > svc.extra.after) p += (guests - svc.extra.after) * svc.extra.perPerson;
  return p;
}

// Quantity limits (used by the widget buttons and again by the server)
export function maxQty(svc, state) {
  const guests = guestCount(state);
  const nights = nightsBetween(state.checkIn, state.checkOut);
  if (svc.basis === "flat") return 1;
  if (svc.basis === "person") return guests || 99;
  if (svc.basis === "day") return nights ? nights + 1 : 99;
  if (svc.basis === "hour") return 24;
  return 10; // trip, unit, group
}
export function defaultQty(svc, state) {
  const guests = guestCount(state);
  if (svc.basis === "flat") return 1;
  if (svc.basis === "person") return guests || 1;
  if (svc.basis === "day") return nightsBetween(state.checkIn, state.checkOut) || 1;
  if (svc.basis === "trip") return Math.ceil(guests / 10) || 1;
  return 1;
}

const BASIS_TEXT = { day: "Per day", person: "Per person", flat: "Flat fee per booking", trip: "Per round trip", unit: "Each", hour: "Per hour", group: "Per group" };

// The price line shown under each service name
export function priceText(svc, state) {
  const guests = guestCount(state);
  let main;
  if (svc.tiers) {
    const [a, b] = svc.tiers;
    if (guests > 0) {
      const t = svc.tiers.find((x) => !x.upTo || guests <= x.upTo) || b;
      main = `${usdN(t.price)}${t.note ? " " + t.note : ""}`;
    } else {
      main = `${usdN(a.price)} for 1–${a.upTo} guests, ${usdN(b.price)} for more${b.note ? " " + b.note : ""}`;
    }
  } else {
    main = usdN(svc.price);
  }
  let text = `${BASIS_TEXT[svc.basis]} · ${main}`;
  if (svc.extra) text += ` (+${usdN(svc.extra.perPerson)} per guest after ${svc.extra.after})`;
  if (svc.note) text += ` · ${svc.note}`;
  if (svc.freeWithStay) text += " · free when accommodation is included";
  return text;
}

/**
 * state = {
 *   mode: "stay" | "services",
 *   destination: id of a destination built from the Rentals collection,
 *   checkIn, checkOut, guests,
 *   tier: "4-6",
 *   ranks: { villaId: "1" | "2" | "3" },   // 3rd choice is optional
 *   package: "silver" | "gold" | "platinum" | null,
 *   services: { chef: qty, atv: qty, ... }   // qty > 0 means selected; ids are those of the destination's price list
 * }
 *
 * Returns the itemized lines, the subtotal, the planning fee, the total, and the deposit / balance.
 */
export function calculate(state) {
  const nights = nightsBetween(state.checkIn, state.checkOut);
  const guests = guestCount(state);
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

  // services of the chosen destination; those included in the package are not charged twice
  // (so the fee is not charged on them twice either)
  const list = servicesFor(state.destination);
  for (const s of list) {
    const qty = Math.min(Math.floor(Number(state.services?.[s.id])) || 0, maxQty(s, state));
    if (qty <= 0 || isCovered(s, pkg)) continue;
    const unit = unitPrice(s, state);
    const amount = money(unit * qty);
    const n = (w) => `${qty} ${w}${qty > 1 ? "s" : ""}`;
    const what = { day: n("day"), person: n("guest"), flat: "flat fee", trip: n("round trip"), unit: `× ${qty}`, hour: n("hour"), group: n("group") }[s.basis];
    const label = unit === 0 ? `${s.name} · included with your stay` : `${s.name} · ${what}`;
    lines.push({ label, amount });
    if (s.group === "yacht") yacht += amount;
  }
  // a boat included in a package also counts toward the deposit
  if (pkg && pkg.includes.includes("yacht")) {
    const boat = list.find((s) => s.group === "yacht" && s.pkg);
    if (boat) yacht += unitPrice(boat, state);
  }

  // subtotal -> planning fee -> total
  const subtotal = money(lines.reduce((t, l) => t + l.amount, 0));
  const serviceFee = money(subtotal * RULES.serviceFeePct);
  const total = money(subtotal + serviceFee);

  // deposit and balance
  const daysToTrip = state.checkIn ? Math.ceil((new Date(state.checkIn) - Date.now()) / dayMs) : null;
  const dueDate = state.checkIn ? new Date(new Date(state.checkIn) - RULES.balanceDueDaysBefore * dayMs) : null;
  const depositBase = (accommodation + yacht) * RULES.depositPct;
  let deposit = money(RULES.depositIncludesFee ? depositBase * (1 + RULES.serviceFeePct) : depositBase);
  let policy = "standard";

  if (state.mode === "services") {
    policy = "services-only";
    if (RULES.servicesOnlyPayFullNow) deposit = total;
  } else if (daysToTrip !== null && daysToTrip <= RULES.balanceDueDaysBefore) {
    policy = "within-window";
    if (RULES.withinWindowPayFullNow) deposit = total;
  }

  return {
    nights, lines, subtotal, serviceFee, serviceFeePct: RULES.serviceFeePct, total, estimated, priceTbd, firstChoice, deposit, policy,
    balance: money(total - deposit),
    balanceDueDate: policy === "standard" && dueDate ? dueDate.toISOString().slice(0, 10) : null,
  };
}