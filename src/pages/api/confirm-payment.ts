// @ts-nocheck
import { saveOrder, orderFromMetadata } from "../../server/orders";
import { getStripe } from "../../server/stripe";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

// POST /api/confirm-payment: called when the guest comes back from Stripe
export async function POST({ request }) {
  try {
    const body = await request.json();
    const sessionId = String(body.sessionId || "");
    if (!sessionId.startsWith("cs_")) return json({ error: "Invalid session." }, 400);

    const stripe = await getStripe();

    // Ask Stripe directly whether this session was really paid
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    if (s.payment_status !== "paid") return json({ paid: false });

    const notStored = await saveOrder(
      orderFromMetadata(s.metadata || {}, {
        id: s.id,
        status: "deposit_paid",
        paymentIntentId: String(s.payment_intent || ""),
        email: s.customer_email || (s.customer_details && s.customer_details.email) || "",
        depositPaid: (s.amount_total || 0) / 100,
        paidAt: new Date().toISOString(),
      })
    );

    return json({ paid: true, notStored });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not confirm this payment. Please try again." }, 500);
  }
}