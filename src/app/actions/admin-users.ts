"use server";

import { revalidatePath } from "next/cache";
import { Role, UserStatus } from "@/lib/enums";
import { ActionResult, toActionResult } from "@/server/http/result";
import {
  adminGetUsersService,
  adminGetUserService,
  adminUpdateUserService,
  adminSetUserStatusService,
  adminDeleteUserService,
  AdminUserListResult,
  AdminUserDetail,
} from "@/server/services/user-admin.service";

export async function adminGetUsers(
  search?: string,
  roleFilter?: Role,
  statusFilter?: UserStatus,
  page?: number,
): Promise<AdminUserListResult> {
  return adminGetUsersService(search, roleFilter, statusFilter, page);
}

export async function adminGetUser(id: string): Promise<{ user: AdminUserDetail }> {
  return adminGetUserService(id);
}

export async function adminUpdateUser(
  id: string,
  data: { role?: Role; usageLimits?: number },
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminUpdateUserService(id, data));
  if (result.ok) revalidatePath("/admin/users");
  return result;
}

export async function adminSetUserStatus(
  id: string,
  status: UserStatus,
  reason?: string,
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminSetUserStatusService(id, status, reason));
  if (result.ok) revalidatePath("/admin/users");
  return result;
}

export async function adminDeleteUser(id: string): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminDeleteUserService(id));
  if (result.ok) revalidatePath("/admin/users");
  return result;
}
