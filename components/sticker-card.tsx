"use client";

import Image from "next/image";
import { memo } from "react";
import type { Sticker } from "@/lib/types";

interface Props {
  sticker: Sticker;
  onOpen: (s: Sticker) => void;
  priority?: boolean;
}

function StickerCardComponent({ sticker, onOpen, priority }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(sticker)}
      className="motion-press ui-focus group relative aspect-square w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-sm hover:border-accent/60 hover:shadow-md"
      aria-label={`查看 ${sticker.name}`}
    >
      <span className="absolute inset-1 rounded-md bg-surface-muted/80" aria-hidden="true" />
      <Image
        src={sticker.previewSrc}
        alt={sticker.name}
        fill
        sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 160px"
        className="object-contain p-2 transition duration-200 ease-out group-hover:scale-105"
        unoptimized
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-foreground/75 to-transparent p-2 text-left text-xs text-background transition duration-200 ease-out group-hover:translate-y-0">
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
