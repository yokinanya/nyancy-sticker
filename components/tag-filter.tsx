"use client";

import { Button } from "@heroui/react";
import { useFilterStore } from "@/lib/store";

interface Props {
  /** 可用标签按使用频率降序 */
  tags: { tag: string; count: number }[];
}

export function TagFilter({ tags }: Props) {
  const selected = useFilterStore((s) => s.tags);
  const toggle = useFilterStore((s) => s.toggleTag);
  const clear = useFilterStore((s) => s.clearTags);

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.slice(0, 30).map(({ tag, count }) => {
        const active = selected.includes(tag);
        return (
          <Button
            key={tag}
            size="sm"
            variant={active ? "primary" : "ghost"}
            onPress={() => toggle(tag)}
          >
            #{tag} <span className="opacity-60">·{count}</span>
          </Button>
        );
      })}
      {selected.length > 0 && (
        <Button size="sm" variant="ghost" onPress={clear}>
          清空标签
        </Button>
      )}
    </div>
  );
}
