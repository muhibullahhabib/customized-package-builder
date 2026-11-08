// @ts-nocheck
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

export const ORDERS_COLLECTION = "Orders";

// Builds an Orders row from the Stripe metadata saved at checkout.
// Every key on the left must exist as a field in the CMS "Orders" collection (see README).
export function orderFromMetadata(m, o) {
  return {
    _id: o.id,
    status: o.status,
    paymentIntentId: o.paymentIntentId || "",
    customerName: m.contact_name || "",
    customerEmail: o.email || "",
    customerPhone: m.contact_phone || "",
    mode: m.mode || "",
    destination: m.destination || "",
    checkIn: m.checkIn || "",
    checkOut: m.checkOut || "",
    nights: Number(m.nights) || 0,
    guests: Number(m.guests) || 0,
    tier: m.tier || "",
    villaFirstChoice: m.villa_1st || "",
    villaSecondChoice: m.villa_2nd || "",
    villaThirdChoice: m.villa_3rd || "",
    orderImage: m.villa_image || "",
    packageName: m.package || "",
    services: m.services || "",
    subtotal: Number(m.subtotal) || 0,
    serviceFee: Number(m.service_fee) || 0,
    estimatedTotal: Number(m.estimated_total) || 0,
    depositPaid: o.depositPaid || 0,
    balance: Number(m.balance) || 0,
    balanceDue: m.balance_due || "",
    paymentPolicy: m.payment_policy || "",
    termsVersion: m.terms_version || "",
    ackAcceptedAt: m.ack_accepted_at || "",
    paidAt: o.paidAt || "",
  };
}

// Removes empty strings so empty values never overwrite saved data or break typed fields
function clean(order) {
  const out = {};
  for (const [k, v] of Object.entries(order)) {
    if (v === "" || v === undefined || v === null) continue;
    out[k] = v;
  }
  return out;
}

// Inserts the order, or updates it if it already exists (same Stripe session id).
// Returns the list of fields the CMS did NOT keep (wrong field ID or wrong field type).
export async function saveOrder(rawOrder) {
  const order = clean(rawOrder);
  const get = auth.elevate(items.get);
  const insert = auth.elevate(items.insert);
  const update = auth.elevate(items.update);

  const existing = await get(ORDERS_COLLECTION, order._id).catch(() => null);
  if (existing) {
    await update(ORDERS_COLLECTION, { ...existing, ...order });
  } else {
    await insert(ORDERS_COLLECTION, order);
  }

  // Read the row back and report fields that were not stored
  const saved = await get(ORDERS_COLLECTION, order._id, { consistentRead: true }).catch(() => null);
  if (!saved) return ["(could not read the order back)"];
  return Object.keys(order).filter((k) => saved[k] === undefined || saved[k] === null);
}