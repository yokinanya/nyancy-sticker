"use client";

import { X } from "lucide-react";
import { createContext, useContext, type ReactNode } from "react";

const TagGroupContext = createContext<{ remove?: (id: React.Key) => void } | null>(null);

export function Tag({ id, children }: { id: React.Key; children: ReactNode }) {
  const tagGroup = useContext(TagGroupContext);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-default-200 bg-default-100 px-2 py-0.5 text-xs">
      {children}
      <button type="button" onClick={() => tagGroup?.remove?.(id)} aria-label={`移除 ${String(id)}`}>
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

export const TagGroup = Object.assign(
  function TagGroup({
    children,
    onRemove,
  }: {
    children: ReactNode;
    onRemove?: (keys: Set<React.Key>) => void;
    "aria-label"?: string;
    size?: "sm";
    variant?: "surface";
  }) {
    return (
      <TagGroupContext.Provider value={{ remove: (id) => onRemove?.(new Set([id])) }}>
        <div className="flex flex-wrap gap-1.5">{children}</div>
      </TagGroupContext.Provider>
    );
  },
  {
    List<T extends { id: React.Key }>({
      children,
      items,
    }: {
      items: readonly T[];
      children: (item: T) => ReactNode;
    }) {
      return <>{items.map((item) => children(item))}</>;
    },
  },
);
