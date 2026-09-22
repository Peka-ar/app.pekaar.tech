import { Query, ID } from "node-appwrite";
import { requirePrincipal, Role } from "@/server/auth-guards";
import {
  DB,
  getTablesDB,
  getRowSafe,
  listAllRows,
  countRows,
  UsersRow,
  ContactRequestRow,
  SubscriptionTier,
  ContactRequestStatus,
} from "@/server/db/client";
import { TIER_MONTHLY_CREDITS } from "@/lib/enums";
import { ForbiddenError, NotFoundError } from "@/server/http/errors";

const CONTACT_REQUESTS_TABLE_ID = "contact_requests";

export interface SubscriptionOverview {
  tier: SubscriptionTier;
  tierName: string;
  creditsRemaining: number;
  monthlyCredits: number;
  renewalDate: string | null;
  overrideApplied: boolean;
}

export async function getSubscriptionOverviewService(): Promise<SubscriptionOverview> {
  const principal = await requirePrincipal();
  const user = await getRowSafe<UsersRow>(DB.users, principal.userId);
  if (!user) throw new NotFoundError("User not found");

  const tier = (user.subscriptionTier as SubscriptionTier) ?? SubscriptionTier.FREE;
  const monthlyCredits = user.monthlyCreditOverride ?? TIER_MONTHLY_CREDITS[tier] ?? TIER_MONTHLY_CREDITS.FREE;
  const creditsRemaining = user.usageLimits ?? 0;

  return {
    tier,
    tierName: tier.charAt(0) + tier.slice(1).toLowerCase(),
    creditsRemaining,
    monthlyCredits,
    renewalDate: user.creditsRenewedAt,
    overrideApplied: user.monthlyCreditOverride != null && user.monthlyCreditOverride > 0,
  };
}

export async function adminSetUserTierService(
  id: string,
  tier: SubscriptionTier,
  monthlyCreditOverride?: number | null,
): Promise<{ success: true }> {
  const principal = await requirePrincipal({ roles: [Role.ADMIN] });
  if (id === principal.userId) throw new ForbiddenError("Cannot update your own account");

  const user = await getRowSafe<UsersRow>(DB.users, id);
  if (!user) throw new NotFoundError("User not found");

  const credits = monthlyCreditOverride ?? TIER_MONTHLY_CREDITS[tier] ?? TIER_MONTHLY_CREDITS.FREE;
  const now = new Date().toISOString();

  await getTablesDB().updateRow<UsersRow>({
    databaseId: DB.databaseId,
    tableId: DB.users,
    rowId: id,
    data: {
      subscriptionTier: tier,
      monthlyCreditOverride: monthlyCreditOverride ?? null,
      usageLimits: credits,
      creditsRenewedAt: now,
    },
  });

  return { success: true };
}

export async function renewMonthlyCredits(): Promise<{ renewed: number }> {
  const tablesDB = getTablesDB();
  const users = await listAllRows<UsersRow>(DB.users, [
    Query.equal("role", "BRAND"),
    Query.equal("status", "ACTIVE"),
  ]);

  let renewed = 0;
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  for (const user of users) {
    if (user.role === Role.ADMIN) continue;

    if (!user.creditsRenewedAt) {
      await tablesDB.updateRow<UsersRow>({
        databaseId: DB.databaseId,
        tableId: DB.users,
        rowId: user.$id,
        data: { creditsRenewedAt: now.toISOString() },
      });
      continue;
    }

    const lastRenewal = new Date(user.creditsRenewedAt);
    if (now.getTime() - lastRenewal.getTime() < THIRTY_DAYS_MS) continue;

    const tier = (user.subscriptionTier as SubscriptionTier) ?? SubscriptionTier.FREE;
    const credits = user.monthlyCreditOverride ?? TIER_MONTHLY_CREDITS[tier] ?? TIER_MONTHLY_CREDITS.FREE;

    await tablesDB.updateRow<UsersRow>({
      databaseId: DB.databaseId,
      tableId: DB.users,
      rowId: user.$id,
      data: {
        usageLimits: credits,
        creditsRenewedAt: now.toISOString(),
      },
    });
    renewed++;
  }

  return { renewed };
}

export interface ContactRequestListResult {
  requests: ContactRequestRow[];
  total: number;
}

export async function adminListContactRequestsService(
  statusFilter?: ContactRequestStatus,
): Promise<ContactRequestListResult> {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const queries: string[] = [Query.orderDesc("$createdAt")];
  if (statusFilter) queries.push(Query.equal("status", statusFilter));

  const requests = await listAllRows<ContactRequestRow>(CONTACT_REQUESTS_TABLE_ID, queries);
  const total = await countRows(CONTACT_REQUESTS_TABLE_ID, statusFilter ? [Query.equal("status", statusFilter)] : []);

  return { requests, total };
}

export async function adminUpdateContactRequestService(
  id: string,
  status: ContactRequestStatus,
): Promise<{ success: true }> {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const tablesDB = getTablesDB();
  const existing = await getRowSafe<ContactRequestRow>(CONTACT_REQUESTS_TABLE_ID, id);
  if (!existing) throw new NotFoundError("Contact request not found");

  await tablesDB.updateRow<ContactRequestRow>({
    databaseId: DB.databaseId,
    tableId: CONTACT_REQUESTS_TABLE_ID,
    rowId: id,
    data: { status },
  });

  return { success: true };
}

export async function adminDeleteContactRequestService(id: string): Promise<{ success: true }> {
  await requirePrincipal({ roles: [Role.ADMIN] });

  const tablesDB = getTablesDB();
  const existing = await getRowSafe<ContactRequestRow>(CONTACT_REQUESTS_TABLE_ID, id);
  if (!existing) throw new NotFoundError("Contact request not found");

  await tablesDB.deleteRow({
    databaseId: DB.databaseId,
    tableId: CONTACT_REQUESTS_TABLE_ID,
    rowId: id,
  });

  return { success: true };
}

export async function submitContactRequestService(data: {
  name: string;
  email: string;
  company?: string | null;
  interestedTier: string;
  message: string;
}): Promise<{ success: true }> {
  const tablesDB = getTablesDB();

  await tablesDB.createRow({
    databaseId: DB.databaseId,
    tableId: CONTACT_REQUESTS_TABLE_ID,
    rowId: ID.unique(),
    data: {
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      interestedTier: data.interestedTier,
      message: data.message,
      status: ContactRequestStatus.NEW,
      sourceIp: null,
    },
  });

  return { success: true };
}
