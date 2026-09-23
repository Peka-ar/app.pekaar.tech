import { SubscriptionTier, TIER_MONTHLY_CREDITS } from "./enums";

export interface Plan {
  id: SubscriptionTier;
  name: string;
  price: number | null; // null = custom (Enterprise)
  priceLabel: string;
  period: string;
  monthlyCredits: number;
  creditLabel: string;
  highlighted: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: SubscriptionTier.FREE,
    name: "Free",
    price: 0,
    priceLabel: "$0",
    period: "forever",
    monthlyCredits: TIER_MONTHLY_CREDITS.FREE,
    creditLabel: "6 credits/mo",
    highlighted: false,
    features: [
      "AI pipeline 3D generation",
      "Model hosting",
      "Embed + AR view",
      "GLB + USDZ formats",
    ],
  },
  {
    id: SubscriptionTier.PREMIUM,
    name: "Premium",
    price: 25,
    priceLabel: "$25",
    period: "/month",
    monthlyCredits: TIER_MONTHLY_CREDITS.PREMIUM,
    creditLabel: "50 credits/mo",
    highlighted: true,
    features: [
      "Everything in Free",
      "Artist-finished models",
      "Artist production quality",
      "Priority support",
    ],
  },
  {
    id: SubscriptionTier.BUSINESS,
    name: "Business",
    price: 50,
    priceLabel: "$50",
    period: "/month",
    monthlyCredits: TIER_MONTHLY_CREDITS.BUSINESS,
    creditLabel: "100 credits/mo",
    highlighted: false,
    features: [
      "Everything in Premium",
      "Higher monthly credits",
      "Volume pricing",
      "Dedicated support",
    ],
  },
  {
    id: SubscriptionTier.ENTERPRISE,
    name: "Enterprise",
    price: null,
    priceLabel: "Custom",
    period: "",
    monthlyCredits: 0, // Custom per account
    creditLabel: "Custom credits",
    highlighted: false,
    features: [
      "Everything in Business",
      "Custom credit allocation",
      "Custom pricing",
      "SLA & dedicated account",
    ],
  },
];

export function getPlanByTier(tier: SubscriptionTier | string | null): Plan | undefined {
  return PLANS.find((p) => p.id === (tier ?? SubscriptionTier.FREE));
}

export function getMonthlyCredits(tier: SubscriptionTier | string | null, override?: number | null): number {
  if (override != null && override > 0) return override;
  return TIER_MONTHLY_CREDITS[(tier as SubscriptionTier) ?? SubscriptionTier.FREE] ?? TIER_MONTHLY_CREDITS.FREE;
}
