"use client";

import Image from "next/image";
import type { Sticker } from "@/lib/types";

interface Props {
  sticker: Sticker;
  onOpen: (s: Sticker) => void;
}

export function StickerCard({ sticker, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(sticker)}
      className="group relative aspect-square w-full overflow-hidden rounded-xl border border-black/5 bg-zinc-100 transition hover:shadow-md hover:ring-2 hover:ring-accent dark:border-white/10 dark:bg-zinc-800"
      aria-label={`查看 ${sticker.name}`}
    >
      <Image
        src={sticker.thumb || sticker.src}
        alt={sticker.name}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
        className="object-contain p-2 transition group-hover:scale-105"
        unoptimized={sticker.ext === "gif"}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-xs text-white transition group-hover:translate-y-0">
        <div className="truncate font-medium">{sticker.name}</div>
        {sticker.tags.length > 0 && (
          <div className="mt-0.5 truncate opacity-80">
            {sticker.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}
          </div>
        )}
      </div>
    </button>
  );
}
