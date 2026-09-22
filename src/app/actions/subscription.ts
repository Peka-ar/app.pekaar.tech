"use server";

import { revalidatePath } from "next/cache";
import { SubscriptionTier, ContactRequestStatus } from "@/lib/enums";
import { ActionResult, toActionResult } from "@/server/http/result";
import { requirePrincipal } from "@/server/auth-guards";
import {
  getSubscriptionOverviewService,
  adminSetUserTierService,
  adminListContactRequestsService,
  adminUpdateContactRequestService,
  adminDeleteContactRequestService,
  submitContactRequestService,
  SubscriptionOverview,
  ContactRequestListResult,
} from "@/server/services/subscription.service";
import { contactRequestSchema } from "@/server/http/schemas";
import { enforceRateLimit, rateLimitKey } from "@/server/http/rate-limit";

export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  return getSubscriptionOverviewService();
}

export async function adminSetUserTier(
  id: string,
  tier: SubscriptionTier,
  monthlyCreditOverride?: number | null,
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminSetUserTierService(id, tier, monthlyCreditOverride));
  if (result.ok) revalidatePath("/admin/users");
  return result;
}

export async function submitPlanRequest(formData: FormData): Promise<ActionResult<{ success: true }>> {
  const principal = await requirePrincipal();

  const name = (formData.get("name") as string)?.trim() ?? "";
  const email = (formData.get("email") as string)?.trim() ?? "";
  const interestedTier = (formData.get("interestedTier") as string) ?? "";
  const message = (formData.get("message") as string)?.trim() ?? "";

  const parsed = contactRequestSchema.safeParse({
    name,
    email,
    company: principal.companyName,
    interestedTier,
    message,
  });
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION" as const, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await enforceRateLimit(rateLimitKey("plan-request", principal.userId), { limit: 5, windowSeconds: 3600 });

  const result = await toActionResult(() => submitContactRequestService(parsed.data));
  if (result.ok) revalidatePath("/admin/requests");
  return result;
}

export async function adminListContactRequests(
  statusFilter?: ContactRequestStatus,
): Promise<ContactRequestListResult> {
  return adminListContactRequestsService(statusFilter);
}

export async function adminUpdateContactRequest(
  id: string,
  status: ContactRequestStatus,
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminUpdateContactRequestService(id, status));
  if (result.ok) revalidatePath("/admin/requests");
  return result;
}

export async function adminDeleteContactRequest(id: string): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminDeleteContactRequestService(id));
  if (result.ok) revalidatePath("/admin/requests");
  return result;
}
