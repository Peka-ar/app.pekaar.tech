import "next-auth";
import "@auth/core/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
    onboarded?: boolean;
  }
  interface Session {
    user: {
      role?: string;
      onboarded?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    onboarded?: boolean;
  }
}
