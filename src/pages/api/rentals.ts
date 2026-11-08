// @ts-nocheck
import { fetchDestinations } from "../../server/catalog";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

// GET /api/rentals: the destinations and villas shown in the trip builder
export async function GET() {
  try {
    const destinations = await fetchDestinations();
    return json({ destinations });
  } catch (e) {
    console.error(e);
    return json({ error: "DEBUG: " + String((e && e.message) || e) }, 500);
  }
}