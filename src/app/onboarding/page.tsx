import { requirePrincipalOrRedirect } from "@/server/auth-guards"
import { redirect } from "next/navigation"
import OnboardingClient from "./OnboardingClient"

export default async function OnboardingPage() {
  const principal = await requirePrincipalOrRedirect({ allowUnonboarded: true })
  if (principal.onboarded) {
    redirect("/dashboard")
  }
  return <OnboardingClient />
}
