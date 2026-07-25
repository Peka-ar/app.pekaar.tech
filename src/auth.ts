import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { prisma } from "@/lib/prisma"
import { authConfig } from "./auth.config"
import { verifyPassword } from "@/lib/password"

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user || !user.hashedPassword || !user.emailVerified) return null;
        if (user.status === 'SUSPENDED') return null;

        const isValid = await verifyPassword(credentials.password as string, user.hashedPassword);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
          onboarded: user.onboarded,
        };
      }
    })
  ]
})
