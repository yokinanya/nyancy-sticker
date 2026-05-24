import { auth } from "@/auth";
import { CharacterList } from "@/components/character-list";
import {
  listCachedCharactersWithCounts,
  listCachedStaffVisibleCharactersWithCounts,
} from "@/lib/queries/characters";

export const revalidate = false;

export default async function HomePage() {
  const session = await auth();
  const canViewAdminOnly = session?.user?.role === "admin" || session?.user?.role === "editor";
  const characters = canViewAdminOnly
    ? await listCachedStaffVisibleCharactersWithCounts()
    : await listCachedCharactersWithCounts();

  return (
    <div className="motion-page page-shell flex max-w-6xl flex-col gap-4">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">选择角色</h2>
          </div>
        </div>
        <CharacterList characters={characters} />
      </section>
    </div>
  );
}
