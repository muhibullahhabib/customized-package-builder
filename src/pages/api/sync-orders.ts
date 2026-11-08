// @ts-nocheck
import { saveOrder, orderFromMetadata } from "../../server/orders";
import { getStripe, getSecret } from "../../server/stripe";

// GET /api/sync-orders?key=...: Stripe এ paid কিন্তু Orders collection এ নেই, এমন booking গুলো কপি করে
export async function GET({ request }) {
  const url = new URL(request.url);
  let syncKey = "";
  try { syncKey = await getSecret("SYNC_KEY"); } catch (e) { return new Response("Not configured", { status: 500 }); }
  if (url.searchParams.get("key") !== syncKey) return new Response("Forbidden", { status: 403 });

  const report = { checked: 0, synced: [], skipped: [], errors: [] };
  try {
    const stripe = await getStripe();
    const list = await stripe.checkout.sessions.list({ limit: 100 });

    for (const s of list.data) {
      report.checked++;
      if (s.payment_status !== "paid" || !s.metadata || !s.metadata.mode) { report.skipped.push(s.id); continue; }
      try {
        const missing = await saveOrder(
          orderFromMetadata(s.metadata, {
            id: s.id,
            status: "deposit_paid",
            paymentIntentId: String(s.payment_intent || ""),
            email: s.customer_email || (s.customer_details && s.customer_details.email) || "",
            depositPaid: (s.amount_total || 0) / 100,
            paidAt: new Date((s.created || 0) * 1000).toISOString(),
          })
        );
        report.synced.push({ id: s.id, notStored: missing });
      } catch (e) {
        report.errors.push({ id: s.id, error: String((e && e.message) || e) });
      }
    }
  } catch (e) {
    report.errors.push({ error: String((e && e.message) || e) });
  }

  return new Response(JSON.stringify(report, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });
}