"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CharacterSummary } from "@/lib/queries/characters";

interface Props {
  characters: readonly CharacterSummary[];
}

export function CharacterList({ characters }: Props) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filteredCharacters = useMemo(
    () => filterCharacters(characters, query),
    [characters, query],
  );

  return (
    <div className="motion-panel flex flex-col gap-3">
      <div className="toolbar p-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索角色"
          className="field-control"
          aria-label="搜索角色"
        />
      </div>
      {filteredCharacters.length === 0 ? (
        <p className="surface p-6 text-center text-sm text-muted">没有匹配的角色。</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              isNavigating={navigatingId === character.id}
              onNavigate={setNavigatingId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CharacterCard({
  character,
  isNavigating,
  onNavigate,
}: {
  character: CharacterSummary;
  isNavigating: boolean;
  onNavigate: (id: string) => void;
}) {
  return (
    <li className="motion-list-item">
      <Link
        href={`/${encodeURIComponent(character.id)}`}
        onClick={() => onNavigate(character.id)}
        className={`motion-press ui-focus surface group flex min-h-28 flex-col justify-between gap-4 p-4 hover:border-primary/45 hover:bg-surface-raised ${
          isNavigating ? "motion-selection border-primary/60 bg-primary/10" : ""
        }`}
        aria-busy={isNavigating}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{character.name}</h3>
            <p className="mt-1 font-mono text-[11px] text-muted">{character.id}</p>
          </div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary">
            {character.count} 张
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">进入图库</span>
          {isNavigating ? (
            <span
              aria-label="正在进入"
              className="h-4 w-4 animate-spin rounded-full border-2 border-default-300 border-t-primary"
              role="status"
            />
          ) : (
            <span className="text-primary transition group-hover:translate-x-0.5">→</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function filterCharacters(characters: readonly CharacterSummary[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return characters;
  return characters.filter((character) => {
    return character.name.toLowerCase().includes(text) || character.id.toLowerCase().includes(text);
  });
}
