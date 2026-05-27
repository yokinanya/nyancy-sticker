import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { StickerGallery } from "@/components/sticker-gallery";
import { listCharacterGallery } from "@/lib/queries/stickers";

export const revalidate = false;

interface PageProps {
  params: Promise<{ character: string }>;
}

const getCharacterGallery = cache((id: string) => listCharacterGallery(id));

export async function generateMetadata({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { character } = await getCharacterGallery(id);
  if (!character || !(await canViewCharacter(character))) return { title: "未找到角色" };
  return { title: `${character.name} - 猫猫冲表情站` };
}

export default async function CharacterGalleryPage({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const { character, stickers, categories } = await getCharacterGallery(id);
  if (!character || !(await canViewCharacter(character))) notFound();

  return (
    <div className="motion-page page-shell flex max-w-7xl flex-col">
      <StickerGallery
        characterId={character.id}
        characterName={character.name}
        manifest={{ categories, stickers }}
        showAllCategoryTab
      />
    </div>
  );
}

async function canViewCharacter(character: { visibility: string } | null): Promise<boolean> {
  if (!character) return false;
  if (character.visibility === "public") return true;
  if (character.visibility === "hidden") return false;
  const session = await auth();
  return session?.user?.role === "admin" || session?.user?.role === "editor";
}
