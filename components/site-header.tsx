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
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/85 backdrop-blur-md">
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
              className="text-sm text-muted hover:text-foreground"
            >
              登录
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
