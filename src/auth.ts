// src/auth.ts
import { prisma } from "@/lib/prisma";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

// Augment the NextAuth types to include the custom user properties
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      onboarded: boolean;
      hasPassword?: boolean;
      role: "USER" | "ADMIN";
      avatarEmoji?: string | null;
      avatarBgColor?: string | null;
      emailVerified?: Date | string | null;
    } & DefaultSession["user"];
  }
  interface JWT {
    image?: string | null;
    role?: "USER" | "ADMIN";
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  }
  interface User {
    username?: string | null;
    onboarded?: boolean;
    hashedPassword?: string | null;
    hasPassword?: boolean;
    role?: "USER" | "ADMIN";
    avatarEmoji?: string | null;
    avatarBgColor?: string | null;
    emailVerified?: Date | string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Must use JWT strategy when using Credentials provider
  session: { strategy: "jwt" },
  providers: [
    // NextAuth v5 standard import convention
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Ensure user exists, has a hashed password, and is NOT a dummy account
        if (!user || !user.hashedPassword || user.isDummy) return null;

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword,
        );

        if (passwordsMatch) {
          return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.name,
            image: user.image,
            avatarEmoji: user.avatarEmoji,
            avatarBgColor: user.avatarBgColor,
            onboarded: user.onboarded,
            hasPassword: !!user.hashedPassword,
            role: user.role as "USER" | "ADMIN",
            emailVerified: user.emailVerified,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    // Intercept login to check for global bans and auto-verify OAuth signups
    async signIn({ user, account }) {
      if (user.email) {
        const activeBan = await prisma.globalBan.findFirst({
          where: {
            email: user.email,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });

        if (activeBan) {
          // Generate a secure token to allow the user to delete their data without a session
          const token = crypto.randomUUID();
          await prisma.globalBan.update({
            where: { id: activeBan.id },
            data: { deleteToken: token },
          });

          // Redirect back to login with the ban details
          const params = new URLSearchParams();
          params.set("banned", "true");
          params.set("token", token);
          params.set(
            "dataAlreadyDeleted",
            String(Boolean(activeBan.userId === null)),
          );
          if (activeBan.reason) params.set("reason", activeBan.reason);
          if (activeBan.expiresAt) {
            params.set("expires", activeBan.expiresAt.toISOString());
          }

          // OAuth providers use a popup flow - redirect to popup-callback so it can
          // postMessage the ban data to the opener window and close the popup itself.
          // Credentials sign-in has no popup, so it redirects directly to the login page.
          if (account?.provider !== "credentials") {
            return `/api/auth/popup-callback?${params.toString()}`;
          }

          // NextAuth handles redirecting. Our proxy.ts will automatically attach the correct locale
          return `/login?${params.toString()}`;
        }
      }

      // OAuth users skip the manual signup verification gate - mark them as verified
      // on their first login. updateMany with a null filter is a no-op on subsequent logins.
      if (account?.provider !== "credentials" && user.id) {
        await prisma.user.updateMany({
          where: { id: user.id, signupVerified: null },
          data: { signupVerified: new Date() },
        });
      }

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // If user object is available (on initial sign in), attach custom properties to the JWT
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.onboarded = user.onboarded;
        token.hasPassword = user.hasPassword ?? !!user.hashedPassword;
        token.image = user.image;
        token.avatarEmoji = user.avatarEmoji;
        token.avatarBgColor = user.avatarBgColor;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }

      // When the client calls update({ onboarded: true }), we rewrite the token
      if (trigger === "update" && session) {
        if (session.onboarded !== undefined)
          token.onboarded = session.onboarded;
        if (session.username !== undefined) token.username = session.username;
        if (session.hasPassword !== undefined)
          token.hasPassword = session.hasPassword;
        if (session.image !== undefined) token.image = session.image;
        if (session.avatarEmoji !== undefined)
          token.avatarEmoji = session.avatarEmoji;
        if (session.avatarBgColor !== undefined)
          token.avatarBgColor = session.avatarBgColor;
        if (session.role !== undefined) token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      // Pass the custom properties from the JWT to the client-accessible session object
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string | null;
        session.user.onboarded = token.onboarded as boolean;
        session.user.hasPassword = token.hasPassword as boolean;
        session.user.image = token.image as string | null;
        session.user.avatarEmoji = token.avatarEmoji as string | null;
        session.user.avatarBgColor = token.avatarBgColor as string | null;
        session.user.role = (token.role as "USER" | "ADMIN") || "USER";
        session.user.emailVerified = token.emailVerified
          ? new Date(token.emailVerified as string | Date)
          : null;
      }
      return session;
    },
  },
});
