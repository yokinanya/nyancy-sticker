"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

interface CharacterRef {
  id: string;
  name: string;
}

interface Props {
  siteName: string;
  characters: readonly CharacterRef[];
}

export function SiteTitle({ siteName, characters }: Props) {
  const params = useParams();
  const raw = params?.character;
  const characterId = Array.isArray(raw) ? raw[0] : raw;
  const decoded = characterId ? decodeURIComponent(characterId) : null;
  const character = decoded ? characters.find((c) => c.id === decoded) : null;

  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="font-semibold tracking-tight">{siteName}</span>
      {character ? (
        <>
          <span className="text-default-400">·</span>
          <span className="text-default-700 dark:text-default-300">{character.name}</span>
        </>
      ) : null}
    </Link>
  );
}
