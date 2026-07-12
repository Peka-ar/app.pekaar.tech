import { auth } from "@/auth";
import AuthClient from "./AuthClient";

type SessionUserWithOnboarding = {
  onboarded?: boolean;
};

export default async function AuthPage() {
  const session = await auth();
  const user = session?.user as SessionUserWithOnboarding | undefined;

  return <AuthClient showOnboardingInitially={Boolean(user && !user.onboarded)} />;
}
