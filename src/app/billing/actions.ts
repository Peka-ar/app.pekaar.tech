"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

const STRIPE_PRICES = {
  Starter: process.env.STRIPE_PRICE_STARTER, // e.g. price_1234
  Growth: process.env.STRIPE_PRICE_GROWTH,
  Enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function createCheckoutSession(tierName: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!dbUser) {
    throw new Error("User not found");
  }

  const priceId = STRIPE_PRICES[tierName as keyof typeof STRIPE_PRICES];

  if (!priceId) {
    throw new Error("Invalid tier or price ID not configured.");
  }

  // Create or retrieve Stripe customer
  let stripeCustomerId = dbUser.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: session.user.name || undefined,
      metadata: {
        userId: dbUser.id,
      },
    });
    stripeCustomerId = customer.id;

    await prisma.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId },
    });
  }

  // Create Checkout Session
  const stripeSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
    metadata: {
      userId: dbUser.id,
      tier: tierName,
    },
  });

  if (!stripeSession.url) {
    throw new Error("Failed to create Stripe session");
  }

  redirect(stripeSession.url);
}

export async function createBillingPortalSession() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser || !dbUser.stripeCustomerId) {
    throw new Error("User not found or no Stripe customer ID");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing`,
  });

  if (!portalSession.url) {
    throw new Error("Failed to create Stripe portal session");
  }

  redirect(portalSession.url);
}
