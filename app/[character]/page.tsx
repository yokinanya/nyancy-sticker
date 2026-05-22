import { notFound } from "next/navigation";
import { StickerGallery } from "@/components/sticker-gallery";
import { findCharacter } from "@/lib/queries/characters";
import { listCharacterGallery } from "@/lib/queries/stickers";

export const revalidate = false;

interface PageProps {
  params: Promise<{ character: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const character = await findCharacter(id);
  if (!character) return { title: "未找到角色" };
  return { title: `${character.name} - 猫猫冲表情站` };
}

export default async function CharacterGalleryPage({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { character, stickers, categories } = await listCharacterGallery(id);
  if (!character) notFound();

  return (
    <div className="motion-page mx-auto flex w-full max-w-7xl flex-col px-4 py-6">
      <StickerGallery manifest={{ categories, stickers }} hideTopLevel />
    </div>
  );
}
