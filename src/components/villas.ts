// @ts-nocheck
// villas.ts: CMS "Rentals" collection থেকে villa ও destination বানায়।
//
// ব্যবহৃত field (Rentals collection):
//   name        : villa এর নাম
//   thumbnail   : ছবি (Wix image field)
//   location    : ঠিকানা (Wix Address field), এখান থেকেই destination ঠিক হয়
//   minNights   : ন্যূনতম কত রাত থাকতে হবে
//   minRang     : প্রতি রাতের দাম (USD)
// ঐচ্ছিক (collection এ থাকলে কাজে লাগে, না থাকলেও সমস্যা নেই):
//   bedrooms, maxOccupancy, maxRang
//
// bedrooms field না থাকলে villa টা সব bedroom tier এ দেখাবে।
export let DESTINATIONS = {};
export const setDestinations = (d) => { DESTINATIONS = d; };

export const tierForBedrooms = (n) =>
  n >= 13 ? "13+" : n >= 10 ? "10-12" : n >= 7 ? "7-9" : n >= 4 ? "4-6" : null;

const TIERS = ["4-6", "7-9", "10-12", "13+"];
const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// ছোট হাতের অক্ষর, accent ছাড়া: "Medellín" -> "medellin"
const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Wix image: "wix:image://v1/<id>~mv2.jpg/<name>#..." (অথবা {src}/{url} object) -> public URL
export function wixImageToUrl(src) {
  if (!src) return "";
  if (typeof src === "object") src = src.src || src.url || src.fileUrl || "";
  if (typeof src !== "string") return "";
  if (src.startsWith("http")) return src;
  const m = src.match(/^wix:image:\/\/v1\/([^/#]+)/);
  return m ? "https://static.wixstatic.com/media/" + m[1] : "";
}

// Dropdown এ যে destination গুলো থাকবে, এই ক্রমে। villa এর location এ keyword মিললে ওই group এ যায়।
// কোনো group এ না মিললে villa টা নিজের "City, Country" destination হিসেবে আসে।
const DESTINATION_GROUPS = [
  { id: "cartagena", name: "Cartagena, Colombia", keywords: ["cartagena"] },
  { id: "medellin", name: "Medellin, Colombia", keywords: ["medellin"] },
  { id: "sosua", name: "Sosua, Dominican Republic", keywords: ["sosua"] },
  { id: "cap-cana-casa-de-campo", name: "Cap Cana/Casa De Campo, Dominican Republic", keywords: ["cap cana", "casa de campo", "la romana", "punta cana"] },
];

// location field থেকে শহর, দেশ আর পুরো লেখা বের করে (Address object বা সাধারণ text দুটোই চলে)
function placeInfo(r) {
  const loc = r.location;
  if (!loc) return { city: "", country: "", all: "" };
  if (typeof loc === "string") {
    const parts = loc.split(",").map((x) => x.trim()).filter(Boolean);
    return { city: parts[0] || "", country: parts.length > 1 ? parts[parts.length - 1] : "", all: norm(loc) };
  }
  const formatted = String(loc.formatted || loc.formattedAddress || "");
  const fparts = formatted.split(",").map((x) => x.trim()).filter(Boolean);
  const city = String(loc.city || loc.subdivision || fparts[0] || "").trim();
  const country = String(loc.countryFullname || loc.countryFullName || loc.country || (fparts.length > 1 ? fparts[fparts.length - 1] : "") || "").trim();
  return { city, country, all: norm(city + " " + formatted + " " + JSON.stringify(loc)) };
}

function destinationFor(place) {
  const byCity = DESTINATION_GROUPS.find((g) => g.keywords.some((k) => norm(place.city).includes(k)));
  const g = byCity || DESTINATION_GROUPS.find((x) => x.keywords.some((k) => place.all.includes(k)));
  if (g) return { id: g.id, name: g.name };
  const name = [place.city, place.country].filter(Boolean).join(", ");
  return { id: slug(name), name };
}

// Rentals এর row গুলোকে { destinationId: { name, tiers: { tier: [villa] } } } বানায়
export function buildDestinations(rows) {
  const out = {};
  const seen = new Set();
  for (const r of rows || []) {
    if (!r || !r.name || seen.has(r._id)) continue;
    seen.add(r._id);

    const place = placeInfo(r);
    if (!place.city && !place.country) continue; // location ছাড়া villa দেখানো যায় না
    const dest = destinationFor(place);
    if (!dest.id) continue;
    if (!out[dest.id]) out[dest.id] = { name: dest.name, tiers: { "4-6": [], "7-9": [], "10-12": [], "13+": [] } };

    const bedrooms = Number(r.bedrooms) || 0;
    const min = Number(r.minRang) || 0;
    const max = Number(r.maxRang) || 0;
    const thumb = r.thumbnail || (r.media && r.media[0] && r.media[0].src) || "";
    const villa = {
      id: r._id,
      name: r.name,
      nightly: min > 0 ? min : null,
      priceFrom: max > min,
      maxGuests: Number(r.maxOccupancy) || undefined,
      minNights: Number(r.minNights) || undefined,
      bedrooms: bedrooms || undefined,
      city: place.city,
      image: wixImageToUrl(thumb),
      thumbnail: typeof thumb === "string" ? thumb : "",
    };

    // bedrooms জানা থাকলে নিজের tier এ, না জানা থাকলে সব tier এ
    const own = tierForBedrooms(bedrooms);
    for (const t of own ? [own] : TIERS) out[dest.id].tiers[t].push(villa);
  }

  // সস্তা villa আগে, দাম না থাকলে শেষে
  for (const d of Object.values(out)) {
    for (const t of TIERS) d.tiers[t].sort((a, b) => (a.nightly || 1e12) - (b.nightly || 1e12));
  }

  // Destination ক্রম: উপরের তালিকা আগে, বাকিগুলো A-Z
  const order = DESTINATION_GROUPS.map((g) => g.id);
  const rank = (k) => (order.includes(k) ? order.indexOf(k) : 1000);
  return Object.fromEntries(
    Object.entries(out).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1].name.localeCompare(b[1].name))
  );
}