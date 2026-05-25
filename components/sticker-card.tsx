"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { memo } from "react";
import type { Sticker } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  sticker: Sticker;
  onOpen: (s: Sticker) => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  priority?: boolean;
}

function StickerCardComponent({ sticker, onOpen, isSelectable = false, isSelected = false, priority }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(sticker)}
      className={cn(
        "motion-press ui-focus sticker-tray group relative aspect-square w-full overflow-hidden rounded-lg border hover:border-accent/60",
        isSelected ? "border-accent ring-2 ring-accent/35" : "border-border-subtle",
      )}
      aria-label={isSelectable ? `${isSelected ? "取消选择" : "选择"} ${sticker.name}` : `查看 ${sticker.name}`}
      aria-pressed={isSelectable ? isSelected : undefined}
    >
      <span className="absolute inset-1 rounded-md bg-surface-muted/80" aria-hidden="true" />
      {isSelectable ? <SelectionBadge isSelected={isSelected} /> : null}
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

function SelectionBadge({ isSelected }: { isSelected: boolean }) {
  return (
    <span
      className={cn(
        "absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border bg-background/90 shadow-sm",
        isSelected ? "border-accent text-accent" : "border-border-subtle text-default-400",
      )}
      aria-hidden="true"
    >
      {isSelected ? <Check className="h-4 w-4" /> : null}
    </span>
  );
}

export const StickerCard = memo(StickerCardComponent);
