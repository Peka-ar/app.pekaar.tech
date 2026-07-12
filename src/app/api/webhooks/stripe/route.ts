import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";



const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event;

  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (userId && tier) {
          let usageLimits = 10; // Starter default
          if (tier === "Growth") usageLimits = 50;
          if (tier === "Enterprise") usageLimits = 1000;

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: tier,
              usageLimits: usageLimits,
            },
          });
        }
        break;
      }
      
      case "customer.subscription.updated": {
        // Here we could handle plan changes, downgrades, etc.
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        
        // Example: if status is not active, we might downgrade them
        if (subscription.status !== 'active') {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              subscriptionTier: null,
              usageLimits: 10,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionTier: null,
            usageLimits: 10,
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
