
// @ts-nocheck
import Stripe from "stripe";
import { secrets } from "@wix/secrets";
import { auth } from "@wix/essentials";

const cache = {};

export async function getSecret(name) {
  if (cache[name]) {
    return cache[name];
  }

  const get = auth.elevate(secrets.getSecretValue);
  const result = await get(name);

  const value =
    result?.value || result?.secret?.value || "";

  if (!value) {
    throw new Error(
      `Secret not found in Wix Secrets Manager: ${name}`
    );
  }

  cache[name] = String(value).trim();

  return cache[name];
}

export async function getStripe() {
  const key = await getSecret("STRIPE_SECRET_KEY");

  if (
    !key.startsWith("sk_test_") &&
    !key.startsWith("sk_live_")
  ) {
    throw new Error("Invalid Stripe Secret Key");
  }

  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
