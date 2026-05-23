import { CharacterList } from "@/components/character-list";
import { listCachedCharactersWithCounts } from "@/lib/queries/characters";

export const revalidate = false;

export default async function HomePage() {
  const characters = await listCachedCharactersWithCounts();
  return (
    <div className="motion-page page-shell flex max-w-6xl flex-col gap-4">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">选择角色</h2>
            <p className="mt-1 text-sm text-muted">进入角色图库后可以继续按分类和标签筛选。</p>
          </div>
        </div>
        <CharacterList characters={characters} />
      </section>
    </div>
  );
}
