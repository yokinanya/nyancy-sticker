import { Suspense } from "react";
import { CharacterList } from "@/components/character-list";
import { getCurrentSession } from "@/lib/current-session";
import {
  listCachedCharactersWithCounts,
  listCachedStaffVisibleCharactersWithCounts,
} from "@/lib/queries/characters";

export default function HomePage() {
  return (
    <Suspense fallback={<CharacterListFallback />}>
      <HomeCharacterList />
    </Suspense>
  );
}

async function HomeCharacterList() {
  const session = await getCurrentSession();
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

function CharacterListFallback() {
  return (
    <div className="page-shell max-w-6xl" aria-live="polite">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="surface aspect-[21/9] min-h-32 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
