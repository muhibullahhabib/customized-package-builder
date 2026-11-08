// @ts-nocheck
import Stripe from "stripe";
import { saveOrder, orderFromMetadata } from "../../server/orders";
import { getStripe, getSecret } from "../../server/stripe";
import { createBalanceDraft } from "../../server/balance";

// POST /api/stripe-webhook: পেমেন্টের পর Stripe নিজে এটা কল করে
export async function POST({ request }) {
  const stripe = await getStripe();
  const webhookSecret = await getSecret("STRIPE_WEBHOOK_SECRET");

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody, signature, webhookSecret, undefined, Stripe.createSubtleCryptoProvider()
    );
  } catch (e) {
    console.error("Invalid signature", e);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    if (s.payment_status === "paid") {
      try {
        const missing = await saveOrder(
          orderFromMetadata(s.metadata || {}, {
            id: s.id,
            status: "deposit_paid",
            paymentIntentId: String(s.payment_intent || ""),
            email: s.customer_email || (s.customer_details && s.customer_details.email) || "",
            depositPaid: (s.amount_total || 0) / 100,
            paidAt: new Date().toISOString(),
          })
        );

        // বাকি টাকার draft invoice (fail করলেও order save নষ্ট হবে না)
        let invoiceId = null;
        try { invoiceId = await createBalanceDraft(stripe, s); }
        catch (e) { console.error("Balance draft failed", e); }

        return new Response("ok. not stored: " + (missing.length ? missing.join(", ") : "none") + (invoiceId ? ". draft invoice: " + invoiceId : ""), { status: 200 });
      } catch (e) {
        console.error("Could not save order", e);
        return new Response("Could not save order", { status: 500 }); // 500 দিলে Stripe পরে আবার চেষ্টা করবে
      }
    }
  }

  return new Response("ok", { status: 200 });
}