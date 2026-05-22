import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

const adminLogins = (process.env.ADMIN_GITHUB_LOGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      const login = (profile as { login?: string } | undefined)?.login;
      if (!login || !user.id) return false;
      const patch: { githubLogin: string; role?: "user" | "admin" } = { githubLogin: login };
      // 仅当 ADMIN_GITHUB_LOGINS 非空时启用强制对齐，避免误清环境变量导致全员降级。
      if (adminLogins.length > 0) {
        if (adminLogins.includes(login)) {
          patch.role = "admin";
        } else {
          const current = await db.query.users.findFirst({
            where: eq(users.id, user.id),
          });
          if (current?.role === "admin") patch.role = "user";
        }
      }
      await db.update(users).set(patch).where(eq(users.id, user.id));
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.githubLogin = dbUser.githubLogin;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "user";
      session.user.githubLogin = token.githubLogin ?? null;
      return session;
    },
  },
});
