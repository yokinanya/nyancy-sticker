"use client";

import { Button } from "@/components/ui/heroui-compat";

interface Props {
  /** 可用标签按使用频率降序 */
  tags: { tag: string; count: number }[];
  selected: readonly string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

export function TagFilter({ tags, selected, onToggle, onClear }: Props) {
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
            onPress={() => onToggle(tag)}
            className={`motion-press ${active ? "motion-selection" : ""}`}
          >
            #{tag} <span className="opacity-60">·{count}</span>
          </Button>
        );
      })}
      {selected.length > 0 && (
        <Button size="sm" variant="ghost" onPress={onClear} className="motion-press">
          清空标签
        </Button>
      )}
    </div>
  );
}
