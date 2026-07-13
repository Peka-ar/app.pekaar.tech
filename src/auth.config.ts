import type { NextAuthConfig } from "next-auth"

type AuthUserFields = {
  role?: string;
  onboarded?: boolean;
};

export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as AuthUserFields).role;
        token.id = user.id;
        token.onboarded = (user as AuthUserFields).onboarded;
      }
      if (trigger === "update" && typeof (session as AuthUserFields | undefined)?.onboarded === "boolean") {
        token.onboarded = (session as AuthUserFields).onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        (session.user as AuthUserFields).role = token.role as string | undefined;
        (session.user as AuthUserFields).onboarded = token.onboarded as boolean | undefined;
      }
      return session;
    }
  },
  providers: [], // Edge-compatible providers
} satisfies NextAuthConfig;
