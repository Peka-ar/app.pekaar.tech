import { requirePrincipalOrRedirect } from "@/server/auth-guards";
import { Role } from "@/lib/enums";
import AdminLayout from "@/components/admin/AdminLayout";
import { AdminRequestsClient } from "./AdminRequestsClient";

export default async function AdminRequestsPage() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });

  return (
    <AdminLayout
      title="Contact Requests"
      user={{ name: principal.companyName ?? principal.email, email: principal.email, role: principal.role }}
    >
      <AdminRequestsClient />
    </AdminLayout>
  );
}
