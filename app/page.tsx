import { CharacterList } from "@/components/character-list";
import { listCharactersWithCounts } from "@/lib/queries/characters";

export const revalidate = false;

export default async function HomePage() {
  const characters = await listCharactersWithCounts();
  return (
    <div className="motion-page mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      <h1 className="mb-2 text-2xl font-semibold">选择角色</h1>
      <p className="mb-6 text-sm text-default-500">
        共 {characters.length} 位角色。点击进入对应表情画廊。
      </p>
      <CharacterList characters={characters} />
    </div>
  );
}
