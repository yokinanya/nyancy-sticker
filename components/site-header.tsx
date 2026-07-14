import Link from "next/link";
import { signOut } from "@/auth";
import {
  listCachedCharacterAccessRows,
} from "@/lib/queries/characters";
import { getCurrentSession } from "@/lib/current-session";
import type { CharacterRef } from "@/lib/types";
import { ThemeToggle } from "./theme-toggle";
import { HeaderUserMenu } from "./header-user-menu";
import { SiteTitle } from "./site-title";

export async function SiteHeader() {
  const [session, characterRows] = await Promise.all([
    getCurrentSession(),
    listCachedCharacterAccessRows(),
  ]);
  const user = session?.user;
  const canViewAdminOnly = user?.role === "admin" || user?.role === "editor";
  const characters = visibleCharacterRefs(characterRows, canViewAdminOnly);

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="liquid-header sticky top-0 z-40 border-b border-border-subtle">
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

function visibleCharacterRefs(
  rows: Awaited<ReturnType<typeof listCachedCharacterAccessRows>>,
  canViewAdminOnly: boolean,
): CharacterRef[] {
  return rows
    .filter((row) => {
      if (row.visibility === "public") return true;
      return canViewAdminOnly && row.visibility === "admin_only";
    })
    .map(({ id, name }) => ({ id, name }));
}
