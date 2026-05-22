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

interface GitHubProfile {
  login?: unknown;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, profile }) {
      const login = readGitHubLogin(profile);
      if (!user.id) throw new Error("GitHub 登录缺少用户 id，无法写入用户资料。");
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

function readGitHubLogin(profile: unknown): string {
  const login = (profile as GitHubProfile | undefined)?.login;
  if (typeof login !== "string" || login.trim() === "") {
    throw new Error("GitHub 登录响应缺少 login，无法写入 githubLogin。");
  }
  return login;
}
