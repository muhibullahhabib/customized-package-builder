// @ts-nocheck
import { calculate, servicesFor } from "../../components/pricing";
import { DESTINATIONS, setDestinations } from "../../components/villas";
import { TERMS_VERSION } from "../../components/terms";
import { fetchDestinations } from "../../server/catalog";
import { saveOrder, orderFromMetadata } from "../../server/orders";
import { getStripe } from "../../server/stripe";

// true = ব্রাউজারে আসল error দেখাবে (শুধু test এর সময়)
const DEBUG = true;

const SITE = "https://dewey457.wixstudio.com/guys-paradise";
const CANCEL_URL = SITE + "/custom-package";

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

// GET /api/checkout: ব্রাউজারে খুললে দেখা যায় সার্ভারে কোন ভার্সন চলছে
export async function GET() {
  return json({ version: "checkout-v3", debug: DEBUG });
}

// POST /api/checkout: validates the booking, calculates the price on the server and creates the Stripe payment page
export async function POST({ request }) {
  // Tracks which step is running, so an error message shows where it happened
  let step = "start";
  try {
    const body = await request.json();
    const isStay = body.mode === "stay";
    const today = new Date().toISOString().slice(0, 10);

    // Load villas from the CMS so prices are calculated from real data
    step = "load-villas";
    setDestinations(await fetchDestinations());

    // 1) Validate input
    step = "validate";
    if (!DESTINATIONS[body.destination]) return json({ error: "Invalid destination." }, 400);
    if (!body.checkIn || !body.checkOut || body.checkIn < today) return json({ error: "Invalid dates." }, 400);
    const guests = Math.floor(Number(body.guests)) || 0;
    if (guests < 1) return json({ error: "Invalid group size." }, 400);
    if (!body.contact?.name || !/^\S+@\S+\.\S+$/.test(body.contact?.email || "")) {
      return json({ error: "Name and a valid email are required." }, 400);
    }
    if (isStay && !body.acknowledgment?.accepted) return json({ error: "Acknowledgment required." }, 400);

    // Villa ranking: a 1st and 2nd choice are required, a 3rd is optional, and every ranked villa must exist
    // in the chosen tier and be able to hold the group
    if (isStay) {
      const list = DESTINATIONS[body.destination].tiers[body.tier] || [];
      const ranked = Object.entries(body.ranks || {}).filter(([, r]) => r);
      const withRank = (n) => ranked.filter(([, r]) => r === n);
      if (ranked.some(([, r]) => !["1", "2", "3"].includes(r)) || withRank("1").length !== 1 || withRank("2").length !== 1 || withRank("3").length > 1) {
        return json({ error: "Please rank your first and second villa preferences." }, 400);
      }
      for (const [id] of ranked) {
        const v = list.find((x) => x.id === id);
        if (!v) return json({ error: "A selected villa is not available in this bedroom tier." }, 400);
        if (v.maxGuests && guests > v.maxGuests) return json({ error: v.name + " sleeps up to " + v.maxGuests + " guests." }, 400);
      }
    }

    // 2) Recalculate the price on the server (the browser quote is ignored).
    //    The quote includes the Guys Paradise planning & service fee (see pricing.ts).
    step = "calculate";
    const quote = calculate(body);
    if (!quote.nights || !quote.total) return json({ error: "Nothing to pay for." }, 400);

    // Minimum stay of the first-choice villa
    if (isStay) {
      const list = DESTINATIONS[body.destination].tiers[body.tier] || [];
      const first = list.find((v) => body.ranks?.[v.id] === "1");
      if (first && first.minNights && quote.nights < first.minNights) {
        return json({ error: first.name + " requires a minimum stay of " + first.minNights + " nights." }, 400);
      }
    }

    const depositCents = Math.round(quote.deposit * 100);
    if (depositCents < 50) return json({ error: "Invalid amount." }, 400);

    // 3) Booking details stored on the Stripe payment (metadata)
    step = "metadata";
    const villaName = (rank) => {
      const list = DESTINATIONS[body.destination].tiers[body.tier] || [];
      return list.find((v) => body.ranks?.[v.id] === rank)?.name || "";
    };
    const villaThumb = (rank) => {
      const list = DESTINATIONS[body.destination].tiers[body.tier] || [];
      const v = list.find((x) => body.ranks?.[x.id] === rank);
      return ((v && (v.thumbnail || v.image)) || "").slice(0, 500);
    };

    // Readable services text and a balance-due value that is never empty
    const serviceText =
      servicesFor(body.destination).filter((s) => Number(body.services?.[s.id]) > 0)
        .map((s) => s.name + " x" + body.services[s.id])
        .join(", ") || "None";
    const balanceDueText =
      quote.balanceDueDate ||
      (quote.policy === "within-window" ? "Stated before final confirmation" : "Paid in full at checkout");

    const metadata = {
      mode: body.mode,
      destination: DESTINATIONS[body.destination].name,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      nights: String(quote.nights),
      guests: String(guests),
      tier: body.tier || "",
      villa_1st: isStay ? villaName("1") : "",
      villa_2nd: isStay ? villaName("2") : "",
      villa_3rd: isStay ? villaName("3") : "",
      villa_image: isStay ? villaThumb("1") : "",
      package: body.package || "",
      services: serviceText.slice(0, 500),
      subtotal: String(quote.subtotal),
      service_fee: String(quote.serviceFee),
      estimated_total: String(quote.total),
      deposit: String(quote.deposit),
      balance: String(quote.balance),
      balance_due: balanceDueText,
      payment_policy: quote.policy,
      contact_name: body.contact.name,
      contact_phone: body.contact.phone || "",
      terms_version: isStay ? TERMS_VERSION : "",
      ack_accepted_at: body.acknowledgment?.acceptedAt || "",
    };

    // 4) Create the Stripe Checkout session
    step = "get-stripe-key";
    const stripe = await getStripe();

    step = "create-stripe-session";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.contact.email,
      customer_creation: "always", // বাকি টাকার invoice এর জন্য Stripe customer লাগে
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: depositCents,
            product_data: { name: isStay ? "Provisional deposit" : "Services payment" },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: SITE + "/custom-package?payment=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: CANCEL_URL,
    });

    // 5) Save a pending order right away, so the booking is recorded before payment is confirmed
    step = "save-order";
    let orderError = "";
    let orderMissing = [];
    try {
      orderMissing = await saveOrder(
        orderFromMetadata(metadata, {
          id: session.id,
          status: "pending_payment",
          email: body.contact.email,
        })
      );
    } catch (e) {
      console.error("Order save failed", e);
      orderError = String((e && e.message) || e);
    }

    return json({ checkoutUrl: session.url, orderError, orderMissing });
  } catch (e) {
    console.error(e);
    // DEBUG = true হলে আসল error দেখায়। সবকিছু ঠিক হলে false করে দিও।
    return json({
      error: DEBUG
        ? "DEBUG [" + step + "]: " + String((e && e.message) || e)
        : "Something went wrong while starting your payment. Please try again or contact us.",
    }, 500);
  }
}