// @ts-nocheck
// Deposit পেমেন্ট হলে বাকি টাকার জন্য Stripe এ একটা DRAFT invoice বানায়।
// কেন draft? Terms অনুযায়ী villa/দাম যাচাই করে final invoice গ্রাহককে approve করাতে হয়।
// তাই টিম Stripe Dashboard এ draft টা দেখে, দরকার হলে বদলে, তারপর "Send" চাপবে।
// Reminder email: Stripe Dashboard > Settings > Billing > Subscriptions and emails > Manage invoices sent to customers
// এখানে "Send reminders before due date / after due date" চালু করলে অটো reminder যাবে।
const DAY = 86400;

export async function createBalanceDraft(stripe, session) {
  const m = session.metadata || {};
  const balance = Number(m.balance) || 0;
  if (m.mode !== "stay" || m.payment_policy !== "standard" || balance <= 0) return null;
  if (!session.customer) return null;

  // due date = check-in এর 30 দিন আগে। যদি সেটা আজ বা অতীত হয়, তাহলে 3 দিন পরে।
  const now = Math.floor(Date.now() / 1000);
  let due = Math.floor(new Date(m.checkIn + "T00:00:00Z").getTime() / 1000) - 30 * DAY;
  if (!due || due <= now + DAY) due = now + 3 * DAY;

  const key = "balance_" + session.id; // webhook দুইবার এলেও একটাই invoice হবে
  const invoice = await stripe.invoices.create(
    {
      customer: session.customer,
      collection_method: "send_invoice",
      due_date: due,
      auto_advance: false, // টিম নিজে finalize করবে
      pending_invoice_items_behavior: "exclude",
      description: "Remaining balance: " + (m.destination || "") + ", " + m.checkIn + " to " + m.checkOut,
      metadata: { booking_session: session.id, kind: "balance" },
    },
    { idempotencyKey: key + "_inv" }
  );
  await stripe.invoiceItems.create(
    {
      customer: session.customer,
      invoice: invoice.id,
      currency: "usd",
      amount: Math.round(balance * 100),
      description: "Remaining trip balance (estimate, subject to final approved invoice)",
    },
    { idempotencyKey: key + "_item" }
  );
  return invoice.id;
}