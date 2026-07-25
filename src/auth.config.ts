import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.id = user.id;
        token.onboarded = user.onboarded;
      }
      if (trigger === "update" && typeof session?.user?.onboarded === "boolean") {
        token.onboarded = session.user.onboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role;
        session.user.onboarded = token.onboarded;
      }
      return session;
    }
  },
  providers: [], // Edge-compatible providers
} satisfies NextAuthConfig;
