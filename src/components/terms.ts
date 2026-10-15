// @ts-nocheck
// terms.ts: client-approved wording shown before payment. Edit text here only.
// Change TERMS_VERSION whenever the wording changes, so each booking records which version the guest accepted.

export const TERMS_VERSION = "2026-10-v1";

export const TERMS_TITLE = "Before You Pay: Provisional Deposit & Final Pricing";

export const TERMS_INTRO =
  "You are submitting a booking request and paying a provisional deposit toward your trip. Your villa reservation is not yet confirmed, and the invoice shown at checkout is an estimate, not your finalized invoice.";

export const TERMS = [
  {
    title: "How your estimated price is calculated",
    body: [
      "Your estimated total and provisional deposit are based on your first-choice villa, travel dates, group size, and selected services. Accommodation pricing may change based on villa availability, seasonal rates, holidays, minimum-stay requirements, and applicable taxes or mandatory property fees.",
    ],
  },
  {
    title: "How your villa is selected",
    body: [
      "Please rank your first and second villa preferences. Our team will check availability and try to secure your first choice. If it is unavailable, we'll review your other preferences and present an available option with its exact price. Ranking a villa does not guarantee availability or authorize us to charge you a higher amount.",
    ],
  },
  {
    title: "Your final invoice and approval",
    body: [
      "Once availability and pricing are verified, we'll send you an itemized invoice identifying the proposed villa, selected services, full trip total, and payment schedule. Any change to the checkout estimate will be clearly explained and requires your approval before we confirm the reservation. We will not automatically charge you for a price increase.",
    ],
  },
  {
    title: "How your deposit is applied",
    body: [
      "Your provisional deposit will be credited in full toward your approved final invoice. If the finalized booking requires a larger deposit, we'll explain the additional amount due. Any excess payment will be applied toward your remaining balance.",
      "If we cannot secure an accommodation option at a price you approve, you may decline the alternatives and receive a full refund of your provisional deposit. Once you approve the final invoice and your reservation is confirmed, the cancellation and refund terms provided with that booking apply.",
      "The remaining balance is due 30 days before arrival. For trips booked within 30 days of arrival, the payment required will be stated before final confirmation.",
    ],
  },
  {
    title: "Seasonal price adjustments",
    body: [
      "Accommodation pricing is based on your travel dates, rather than the date you make your booking. Your final invoice may increase or decrease once availability and the applicable seasonal rate are confirmed.",
      "If the confirmed price is lower than your checkout estimate, we will reduce your invoice accordingly. Your provisional deposit will remain fully credited toward your trip. If your payment exceeds the required deposit for the finalized booking, you may apply the excess toward your remaining balance or request a refund of that excess amount.",
      "Any increase requires your approval before the reservation is confirmed.",
    ],
  },
];

// The checkbox the guest must tick before paying (exact wording from the client).
export const ACK_TEXT =
  "I understand that my payment is a provisional deposit, my villa is not yet confirmed, and the checkout invoice is an estimate. Final pricing may change due to availability or seasonal rates. Any revised total requires my approval, and my deposit will be applied in full to the approved final invoice.";

// Villa rating system (exact wording from the client).
export const RATING_LEGEND = [
  { name: "Location", levels: [
    "Average location; not within walking distance of the main area and without a notable view.",
    "A good view or somewhat close to town.",
    "A great view, beachfront or beach-view location, and possibly within walking distance of the main strip or area.",
  ] },
  { name: "Luxury", levels: [
    "Comfortable, standard accommodations with basic finishes and amenities.",
    "Well-maintained, with upgraded finishes or furnishings and good amenities.",
    "The most upscale feel, with high-end finishes, premium furnishings, or standout amenities.",
  ] },
  { name: "Value", levels: [
    "A fair option, but not especially strong for the price compared with other villas in its tier.",
    "Good, competitive value for the space, condition, location, and amenities.",
    "An especially strong deal for the price, offering notably more space, quality, location, or amenities for the cost.",
  ] },
];