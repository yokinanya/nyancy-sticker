"use client";

import Link from "next/link";
import { useState } from "react";
import type { CharacterSummary } from "@/lib/queries/characters";

interface Props {
  characters: readonly CharacterSummary[];
}

export function CharacterList({ characters }: Props) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  return (
    <ul className="motion-panel flex flex-col divide-y divide-default-200 rounded-lg border border-default-200 bg-content1 shadow-sm">
      {characters.map((character) => {
        const isNavigating = navigatingId === character.id;
        return (
          <li key={character.id} className="motion-list-item">
            <Link
              href={`/${encodeURIComponent(character.id)}`}
              onClick={() => setNavigatingId(character.id)}
              className={`motion-press flex items-center justify-between px-4 py-3 hover:bg-default-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${isNavigating ? "motion-selection bg-primary/10" : ""}`}
              aria-busy={isNavigating}
            >
              <span className="text-base font-medium">{character.name}</span>
              {isNavigating ? (
                <span
                  aria-label="正在进入"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-default-300 border-t-primary"
                  role="status"
                />
              ) : (
                <span className="text-sm text-default-500">{character.count} 张</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
