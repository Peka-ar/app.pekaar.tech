import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();
  const user = session?.user as { onboarded?: boolean } | undefined;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  if (user?.onboarded) {
    redirect("/dashboard");
  }

  return <OnboardingClient />;
}
