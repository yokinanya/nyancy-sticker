"use client";

import Image from "next/image";
import { memo, useState } from "react";
import type { Sticker } from "@/lib/types";

interface Props {
  sticker: Sticker;
  onOpen: (s: Sticker) => void;
}

function StickerCardComponent({ sticker, onOpen }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onOpen(sticker)}
      className="motion-interactive ui-focus group relative aspect-square w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm hover:border-accent/60 hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent dark:border-white/10 dark:bg-zinc-900"
      aria-label={`查看 ${sticker.name}`}
    >
      {!loaded && (
        <div className="absolute inset-2 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
      )}
      <Image
        src={sticker.thumb || sticker.src}
        alt={sticker.name}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
        className={`object-contain p-2 transition duration-200 ease-out group-hover:scale-105 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        unoptimized={sticker.ext === "gif"}
        onLoad={() => setLoaded(true)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-2 text-left text-xs text-white transition duration-200 ease-out group-hover:translate-y-0">
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

export const StickerCard = memo(StickerCardComponent);
