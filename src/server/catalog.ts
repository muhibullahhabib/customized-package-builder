// @ts-nocheck
import { items } from "@wix/data";
import { auth } from "@wix/essentials";
import { buildDestinations } from "../components/villas";

// Reads the villas from the CMS "Rentals" collection and groups them by destination and bedroom tier
export async function fetchDestinations() {
  const elevatedQuery = auth.elevate(items.query);
  const result = await elevatedQuery("Rentals").limit(1000).find();
  return buildDestinations(result.items);
}