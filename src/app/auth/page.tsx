import { auth } from "@/auth";
import AuthClient from "./AuthClient";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const session = await auth();
  const user = session?.user as { onboarded?: boolean } | undefined;

  if (user && !user.onboarded) {
    redirect("/onboarding");
  }

  return <AuthClient />;
}
