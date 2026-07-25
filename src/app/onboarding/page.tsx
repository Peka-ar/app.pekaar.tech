import { requirePrincipalOrRedirect } from "@/lib/auth-guards"
import { redirect } from "next/navigation"
import OnboardingClient from "./OnboardingClient"

export default async function OnboardingPage() {
  const principal = await requirePrincipalOrRedirect()
  if (principal.onboarded) {
    redirect("/dashboard")
  }
  return <OnboardingClient />
}
