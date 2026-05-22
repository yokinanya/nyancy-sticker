import Link from "next/link";
import { auth, signOut } from "@/auth";
import { listCachedCategories } from "@/lib/queries/categories";
import { ThemeToggle } from "./theme-toggle";
import { HeaderUserMenu } from "./header-user-menu";
import { SiteTitle } from "./site-title";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;
  const categories = await listCachedCategories();
  const characters = categories
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, name: c.name }));

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3">
        <SiteTitle siteName="猫猫冲表情站" characters={characters} />
        <div className="flex items-center gap-3">
          {user ? (
            <HeaderUserMenu
              user={{
                name: user.name ?? user.githubLogin ?? "用户",
                image: user.image ?? null,
                role: user.role,
                githubLogin: user.githubLogin ?? null,
              }}
              logoutAction={logoutAction}
            />
          ) : (
            <Link
              href="/login"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              登录
            </Link>
          )}
          <a
            href="https://github.com/yokinanya/nyancy-sticker"
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            GitHub
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
