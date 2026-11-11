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
// basis:  "day"      = per day                      "person"   = per guest
//         "flat"     = one fee per booking          "trip"     = per round trip (one vehicle, up to 10 guests)
//         "unit"     = per event (DJ, ...)          "hour"     = per hour
//         "group"    = per group of up to 10        "staffhour"= per person per hour (the guest picks the number of people AND the hours)
// tab:    "regular"  = services offered everywhere  "location" = tours / experiences of this place only
// group:  used by the packages (a package covers every service of the groups it lists)
// tiers:  price depends on the group size, e.g. the chef. The first tier whose "upTo" fits the guest count wins.
// extra:  flat fee plus a price per guest above a number of guests (catamarans)
// freeWithStay: free when a villa / accommodation is booked as well (the host)
// A service with price: null is hidden until the client sends its price.
// ------------------------------------------------------------------------------------------------
const regular = (o) => [
  { id: "chef", name: "Chef", group: "chef", basis: "day", tab: "regular", note: "3 meals per day",
    tiers: [{ upTo: 10, price: o.chef[0] }, { price: o.chef[1], note: "with assistant" }] },
  { id: "transfer", name: "Airport transfer", group: "transfer", basis: "trip", tab: "regular", price: o.transfer, note: "up to 10 guests" },
  { id: "chauffeur", name: "Chauffeur (15-passenger van)", group: "transport", basis: "day", tab: "regular", price: o.chauffeur, note: "8 hours per day" },
  { id: "massage", name: "Massage", group: "massage", basis: "person", tab: "regular", price: o.massage },
  { id: "host", name: "Host", group: "host", basis: "flat", tab: "regular", price: 100, freeWithStay: true },
  { id: "sushi", name: "Sushi model", group: "sushi", basis: "hour", tab: "regular", price: 250 },
  { id: "welcome", name: "Welcome model", group: "welcome", basis: "hour", tab: "regular", price: o.welcome },
  { id: "dj", name: "DJ / Bartender", group: "dj", basis: "unit", tab: "regular", price: o.dj, note: "4 hours total" },
  { id: "lingerie", name: "Lingerie waitress", group: "lingerie", basis: "staffhour", tab: "regular", price: 200 },
  { id: "vip", name: "VIP nightclub", group: "vip", basis: "group", tab: "regular", price: o.vip, note: `up to 10 guests, ${o.bottles} bottles` },
];

const loc = (id, name, basis, price, more = {}) => ({ id, name, group: more.group || id, basis, price, tab: "location", ...more });

export const REGIONS = {
  medellin: {
    label: "Medellín",
    services: [
      ...regular({ chef: [225, 275], transfer: 225, chauffeur: 250, massage: 79, welcome: 150, dj: 550, vip: 750, bottles: 2 }),
      loc("guatape", "Guatape pontoon boat party", "flat", 1000, { group: "yacht", note: "4 hours, includes city tour and transportation" }),
      loc("atv", "ATV", "person", 130),
      loc("comuna", "Comuna tour", "person", 70),
      loc("paintball", "Paintball experience", "person", 125),
      loc("escobar", "Escobar tour", "person", 80),
    ],
  },
  "dominican-republic": {
    label: "Dominican Republic",
    services: [
      ...regular({ chef: [225, 275], transfer: 195, chauffeur: 295, massage: 79, welcome: 150, dj: 550, vip: 750, bottles: 2 }),
      loc("atv", "ATV", "person", 90),
      loc("zip", "Zipline", "person", 90),
      loc("hike", "Mini hike and waterfall tour", "person", 90),
    ],
  },
  jaco: {
    label: "Jaco",
    services: [
      ...regular({ chef: [225, 325], transfer: 395, chauffeur: 295, massage: 85, welcome: 200, dj: 550, vip: 750, bottles: 2 }),
      // ⚠️ the 4 hours come from the Gold package wording; confirm it is the same boat as this one
      loc("yacht-party", "Yacht party (up to 15 people)", "flat", 2050, { group: "yacht", note: "half day, 4 hours" }),
      loc("atv", "ATV", "person", 109),
      loc("zip", "Zipline tour", "person", 85),
      loc("manuel-antonio", "Manuel Antonio and monkey tour", "person", 120),
      loc("rafting", "White water rafting", "person", 170),
    ],
  },
  cartagena: {
    label: "Cartagena",
    services: [
      ...regular({ chef: [225, 275], transfer: 125, chauffeur: 285, massage: 79, welcome: 150, dj: 425, vip: 995, bottles: 3 }),
      loc("cat-51", "Catamaran 51 ft (up to 15 people)", "flat", 3195, { group: "yacht", extra: { after: 15, perPerson: 30 }, note: "full day to Rosario Islands / Cholon, up to 35 guests" }),
      loc("cat-47", "Catamaran 47 ft (up to 15 people)", "flat", 2995, { group: "yacht", extra: { after: 15, perPerson: 30 } }),
      loc("yacht-70", "Yacht 70 ft", "flat", 3750, { group: "yacht" }),
      loc("yacht-82", "Yacht 82 ft", "flat", 6000, { group: "yacht" }),
      // ⚠️ the "full day, Rosario Islands, up to 20 guests" comes from the Gold package wording; confirm it is the same boat
      loc("speedboat", "Speed boats", "flat", 1195, { group: "yacht", note: "full-day Rosario Islands excursion, up to 20 guests" }),
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

// ------------------------------------------------------------------------------------------------
// PACKAGES, PER LOCATION (final rates from the client)
//
// perPerson: price per guest. min: minimum group size (smaller groups are sent to "Customize Package").
// covers:    service GROUPS the package already pays for (those are not charged again, and carry no extra fee).
// boat:      the id of the boat service the package includes (only that boat is covered; null = no priced boat in the list).
// limits:    included amount of a day-based service, e.g. chef 4 days. Extra days are charged normally.
// items:     the wording shown to the guest ("What's included"). Items without a matching service (bartender,
//            security guard, bottle of liquor) are shown only.
// The planning fee is charged once on the package price.
// ------------------------------------------------------------------------------------------------
const PKG_BASE = {
  silver: { label: "Silver", tagline: "Core trip essentials", min: 6 },
  gold: { label: "Gold", tagline: "More included experiences", min: 10, popular: true },
  platinum: { label: "Platinum", tagline: "Premium trip selection", min: 10 },
};

const PKG_BY_REGION = {
  medellin: {
    silver: { perPerson: 249, covers: ["atv", "transfer", "massage", "host"],
      items: ["ATV adventure", "Bartender service", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
    gold: { perPerson: 379, covers: ["yacht", "atv", "dj", "transfer", "massage", "host"], boat: "guatape",
      items: ["Guatape pontoon boat party: 4 hours, including city tour and transportation", "ATV adventure", "DJ service", "Bartender service", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
    platinum: { perPerson: 629, covers: ["chef", "transport", "yacht", "atv", "dj", "transfer", "massage", "host"], boat: "guatape", limits: { chef: 4, transport: 4 },
      items: ["Chef service: 4 days, 3 meals per day", "Chauffeur: 4 days, 8 hours per day", "Guatape pontoon boat party: 4 hours, including city tour and transportation", "ATV adventure", "DJ & bartender service", "Security guard: 4 days", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
  },
  cartagena: {
    silver: { perPerson: 249, covers: ["atv", "transfer", "massage", "host"],
      items: ["ATV adventure", "Bartender service", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
    gold: { perPerson: 379, covers: ["yacht", "atv", "dj", "transfer", "massage", "host"], boat: "speedboat",
      items: ["Full-day speedboat excursion to Rosario Islands: accommodates up to 20 guests", "ATV adventure", "DJ service", "Bartender service", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
    platinum: { perPerson: 835, covers: ["chef", "transport", "yacht", "atv", "dj", "transfer", "massage", "host"], boat: "cat-51", limits: { chef: 4, transport: 4 },
      items: ["Chef service: 4 days, 3 meals per day", "Chauffeur: 4 days, 8 hours per day", "Full-day catamaran excursion to Rosario Islands / Cholon: accommodates up to 35 guests (51 ft)", "ATV adventure", "DJ & bartender service: 4 hours", "Security guard: 4 days", "Round-trip airport transportation", "One massage per guest", "FREE hosting"] },
  },
  jaco: {
    silver: { perPerson: 349, covers: ["atv", "zip", "transfer", "massage", "host"],
      items: ["ATV adventure", "Zipline adventure", "Round-trip airport transportation", "One FREE bottle of liquor", "One massage per guest", "FREE hosting"] },
    gold: { perPerson: 549, covers: ["yacht", "atv", "zip", "dj", "transfer", "massage", "host"], boat: "yacht-party",
      items: ["Half-day yacht cruise: 4 hours", "ATV adventure", "Zipline adventure", "DJ service", "Bartender service", "Round-trip airport transportation", "One FREE bottle of liquor", "One massage per guest", "FREE hosting"] },
    platinum: { perPerson: 799, covers: ["chef", "transport", "yacht", "atv", "zip", "dj", "transfer", "massage", "host"], boat: "yacht-party", limits: { chef: 4, transport: 4 },
      items: ["Chef service: 4 days, 3 meals per day", "Chauffeur: 4 days, 8 hours per day", "Half-day yacht cruise: 4 hours, transportation included", "ATV & zipline adventure", "DJ & bartender service: 4 hours", "Security guard: 4 days", "Round-trip airport transportation", "One FREE bottle of liquor", "One massage per guest", "FREE hosting"] },
  },
  // Sosúa. The same packages are used for Cap Cana / Casa de Campo (⚠️ confirm with the client).
  // The boat (yacht cruise or party catamaran) has no price in the DR service list, so it is shown but not counted toward the deposit.
  "dominican-republic": {
    silver: { perPerson: 299, covers: ["atv", "zip", "transfer", "massage", "host"],
      items: ["ATV adventure", "Zipline adventure", "Round-trip airport transportation", "One FREE bottle of liquor", "One 60-minute massage per guest", "FREE hosting"] },
    gold: { perPerson: 499, covers: ["atv", "zip", "dj", "transfer", "massage", "host"], boat: null,
      items: ["Half-day yacht cruise or party catamaran: food and transportation included", "ATV adventure", "Zipline adventure", "DJ service: 4 hours", "Bartender service: 4 hours", "Round-trip airport transportation", "One FREE bottle of liquor", "One massage per guest", "FREE hosting"] },
    platinum: { perPerson: 749, covers: ["chef", "transport", "atv", "zip", "dj", "transfer", "massage", "host"], boat: null, limits: { chef: 4, transport: 4 },
      items: ["Chef service: 4 days, 3 meals per day", "Chauffeur: 4 days, 8 hours per day", "Half-day yacht cruise or party catamaran: food and transportation included", "ATV & zipline adventure", "DJ & bartender service: 4 hours", "Security guard: 4 nights", "Round-trip airport transportation", "One FREE bottle of liquor", "One massage per guest", "FREE hosting"] },
  },
};

// The packages of a destination: { silver: {label, tagline, min, perPerson, covers, boat, limits, items}, gold: ..., platinum: ... }
export function packagesFor(destinationId) {
  const r = PKG_BY_REGION[regionFor(destinationId)];
  if (!r) return {};
  const out = {};
  for (const k of Object.keys(PKG_BASE)) out[k] = { key: k, boat: null, limits: {}, ...PKG_BASE[k], ...r[k] };
  return out;
}

// Is this service already paid for by the package? (a package boat only covers the boat it names)
export const isCovered = (svc, pkg) => !!pkg && pkg.covers.includes(svc.group) && (svc.group !== "yacht" || svc.id === pkg.boat);
// How many days of a day-based service the package includes (0 = fully included, or not included at all)
export const includedQty = (svc, pkg) => (isCovered(svc, pkg) ? (pkg.limits && pkg.limits[svc.group]) || 0 : 0);

export const RULES = {
  // The estimate is based on the guest's FIRST-CHOICE villa (per the client's "Before You Pay" wording).
  // "first-choice" = price of the 1st-choice villa. "highest-ranked" = the higher price of the 1st and 2nd choice.
  accommodationPriceRule: "first-choice",

  // Guys Paradise Planning & Service Fee: a percentage of the subtotal of the selected accommodation,
  // package, tours and services. It also applies to services-only bookings. Taxes, payment-processing fees
  // and refundable security deposits are NOT part of the subtotal (the builder has none of them).
  serviceFeePct: 0.135,

  depositPct: 0.5,          // provisional deposit = 50% of accommodation + 50% of the boat
  // Client decision: the whole planning fee is collected with the final balance, so the deposit is
  // 50% of accommodation + 50% of the boat WITHOUT the fee.
  depositIncludesFee: false,
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
export const MAX_STAFF = 10; // most waitresses that can be booked at once

export function maxQty(svc, state) {
  const guests = guestCount(state);
  const nights = nightsBetween(state.checkIn, state.checkOut);
  if (svc.basis === "flat") return 1;
  if (svc.basis === "person") return guests || 99;
  if (svc.basis === "day") return nights ? nights + 1 : 99;
  if (svc.basis === "hour" || svc.basis === "staffhour") return 24;
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

const BASIS_TEXT = { day: "Per day", person: "Per person", flat: "Flat fee per booking", trip: "Per round trip", unit: "Per event", hour: "Per hour", staffhour: "Per person, per hour", group: "Flat group price" };

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
 *   staff: { lingerie: 2 }                  // number of people for "staffhour" services (default 1)
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

  // the package of this destination; groups below its minimum size get no package price (they customize instead)
  const pkgs = packagesFor(state.destination);
  let pkg = state.package ? pkgs[state.package] || null : null;
  if (pkg && guests < pkg.min) pkg = null;
  if (pkg) {
    lines.push({ label: `${pkg.label} package × ${guests} guest${guests > 1 ? "s" : ""}`, amount: pkg.perPerson * guests });
  }

  // services of the chosen destination; those included in the package are not charged twice
  // (so the fee is not charged on them twice either). A package that includes only some days (chef 4 days)
  // charges the extra days the guest adds.
  const list = servicesFor(state.destination);
  for (const s of list) {
    const covered = isCovered(s, pkg);
    const limited = includedQty(s, pkg) > 0;
    if (covered && !limited) continue;
    const qty = Math.min(Math.floor(Number(state.services?.[s.id])) || 0, maxQty(s, state));
    if (qty <= 0) continue;
    const unit = unitPrice(s, state);
    const staff = s.basis === "staffhour" ? Math.min(Math.max(Math.floor(Number(state.staff?.[s.id])) || 1, 1), MAX_STAFF) : 1;
    const amount = money(unit * qty * staff);
    const n = (w) => `${qty} ${covered ? "extra " : ""}${w}${qty > 1 ? "s" : ""}`;
    const what = {
      day: n("day"), person: n("guest"), flat: "flat fee", trip: n("round trip"), unit: `× ${qty}`, hour: n("hour"), group: n("group"),
      staffhour: `${staff} ${staff > 1 ? "people" : "person"} × ${qty} hour${qty > 1 ? "s" : ""}`,
    }[s.basis];
    const label = unit === 0 ? `${s.name} · included with your stay` : `${s.name} · ${what}`;
    lines.push({ label, amount });
    if (s.group === "yacht") yacht += amount;
  }
  // the boat included in a package also counts toward the deposit
  if (pkg && pkg.boat) {
    const boat = list.find((s) => s.id === pkg.boat);
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
    package: pkg ? pkg.key : null, nights, lines, subtotal, serviceFee, serviceFeePct: RULES.serviceFeePct, total, estimated, priceTbd, firstChoice, deposit, policy,
    balance: money(total - deposit),
    balanceDueDate: policy === "standard" && dueDate ? dueDate.toISOString().slice(0, 10) : null,
  };
}