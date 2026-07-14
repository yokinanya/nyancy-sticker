import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StickerGallery } from "@/components/sticker-gallery";
import { getCurrentSession } from "@/lib/current-session";
import {
  findCachedCharacterAccess,
  type CharacterAccess,
} from "@/lib/queries/characters";
import { listCachedCharacterGallery } from "@/lib/queries/stickers";

interface PageProps {
  params: Promise<{ character: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const character = await findCachedCharacterAccess(id);
  if (!character || !(await canViewCharacter(character))) return { title: "未找到角色" };
  return { title: `${character.name} - 猫猫冲表情站` };
}

export default async function CharacterGalleryPage({ params }: PageProps) {
  const { character: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const character = await findCachedCharacterAccess(id);
  if (!character) notFound();
  if (character.visibility === "hidden") notFound();

  if (character.visibility === "admin_only") {
    return (
      <Suspense fallback={<GalleryFallback />}>
        <RestrictedGallery character={character} />
      </Suspense>
    );
  }

  return <CharacterGallery character={character} />;
}

async function RestrictedGallery({ character }: { character: CharacterAccess }) {
  if (!(await canViewCharacter(character))) notFound();
  return <CharacterGallery character={character} />;
}

async function CharacterGallery({ character }: { character: CharacterAccess }) {
  const manifest = await listCachedCharacterGallery(character.id);

  return (
    <div className="motion-page page-shell flex max-w-7xl flex-col">
      <StickerGallery
        characterId={character.id}
        characterName={character.name}
        manifest={manifest}
        showAllCategoryTab
      />
    </div>
  );
}

async function canViewCharacter(character: CharacterAccess | null): Promise<boolean> {
  if (!character) return false;
  if (character.visibility === "public") return true;
  if (character.visibility === "hidden") return false;
  const session = await getCurrentSession();
  return session?.user?.role === "admin" || session?.user?.role === "editor";
}

function GalleryFallback() {
  return (
    <div className="page-shell max-w-7xl" aria-live="polite">
      <div className="h-10 animate-pulse rounded-lg bg-default-100" />
    </div>
  );
}
