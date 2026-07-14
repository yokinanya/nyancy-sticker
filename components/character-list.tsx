"use client";

import Link, { useLinkStatus } from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { CharacterSummary } from "@/lib/queries/characters";

interface Props {
  characters: readonly CharacterSummary[];
}

export function CharacterList({ characters }: Props) {
  const [query, setQuery] = useState("");
  const filteredCharacters = useMemo(
    () => filterCharacters(characters, query),
    [characters, query],
  );

  return (
    <div className="motion-panel flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索角色"
        className="field-control"
        aria-label="搜索角色"
      />
      {filteredCharacters.length === 0 ? (
        <p className="surface p-6 text-center text-sm text-muted">没有匹配的角色。</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCharacters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CharacterCard({ character }: { readonly character: CharacterSummary }) {
  return (
    <li className="motion-list-item">
      <Link
        href={`/${encodeURIComponent(character.id)}`}
        className="motion-press ui-focus group block rounded-lg"
      >
        <CharacterCardContent character={character} />
      </Link>
    </li>
  );
}

function CharacterCardContent({ character }: { readonly character: CharacterSummary }) {
  const { pending } = useLinkStatus();
  const hasBackground = Boolean(character.backgroundImageUrl);

  return (
    <div
      className={`surface relative flex aspect-[21/9] min-h-32 flex-col justify-between gap-4 overflow-hidden p-4 hover:border-primary/45 hover:bg-surface-raised ${
        pending ? "motion-selection border-primary/60 bg-primary/10" : ""
      }`}
      aria-busy={pending}
    >
      <CharacterBackground url={character.backgroundImageUrl} />
      <CharacterHeading character={character} hasBackground={hasBackground} />
      <CharacterNavigation hasBackground={hasBackground} isNavigating={pending} />
    </div>
  );
}

function CharacterBackground({ url }: { readonly url: string | null }) {
  if (!url) return null;
  return <><Image src={url} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw" className="object-cover object-center opacity-90 transition duration-200 group-hover:scale-[1.02] group-hover:opacity-100" /><div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/36 to-black/12" /></>;
}

function CharacterHeading({ character, hasBackground }: { readonly character: CharacterSummary; readonly hasBackground: boolean }) {
  return (
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0"><h3 className={`truncate text-base font-semibold ${hasBackground ? "text-white" : ""}`}>{character.name}</h3><p className={`mt-1 font-mono text-[11px] ${hasBackground ? "text-white/75" : "text-muted"}`}>{character.id}</p></div>
      <span className={`rounded-md border px-2 py-1 text-xs ${hasBackground ? "border-white/30 bg-black/30 text-white shadow-sm" : "border-primary/20 bg-primary/10 text-primary"}`}>{character.count} 张</span>
    </div>
  );
}

function CharacterNavigation({ hasBackground, isNavigating }: { readonly hasBackground: boolean; readonly isNavigating: boolean }) {
  const color = hasBackground ? "text-white" : "text-primary";
  return (
    <div className="relative flex items-center justify-between text-sm">
      <span className={hasBackground ? "text-white/85" : "text-muted"}>进入图库</span>
      {isNavigating ? <span aria-label="正在进入" className={`h-4 w-4 animate-spin rounded-full border-2 ${hasBackground ? "border-white/35 border-t-white" : "border-default-300 border-t-primary"}`} role="status" /> : <span className={`${color} transition group-hover:translate-x-0.5`}>→</span>}
    </div>
  );
}

function filterCharacters(characters: readonly CharacterSummary[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return characters;
  return characters.filter((character) => {
    return character.name.toLowerCase().includes(text) || character.id.toLowerCase().includes(text);
  });
}
