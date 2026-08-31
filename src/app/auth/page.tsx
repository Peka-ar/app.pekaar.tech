import AuthClient from "./AuthClient";
import { redirect } from "next/navigation";
import { requirePrincipal } from "@/server/auth-guards";

export default async function AuthPage() {
  let principal;
  try {
    principal = await requirePrincipal();
  } catch {
    return <AuthClient />;
  }

  if (!principal.onboarded) {
    redirect("/onboarding");
  }
  if (principal.role === "ADMIN") {
    redirect("/admin/dashboard");
  }
  redirect("/dashboard");
}