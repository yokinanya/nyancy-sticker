"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { StickerCard } from "./sticker-card";
import type { Sticker } from "@/lib/types";

interface Props {
  stickers: Sticker[];
  onOpen: (s: Sticker) => void;
}

/**
 * 虚拟滚动网格：根据容器宽度动态计算列数，逐行渲染。
 * 每行高度固定（aspect-square + gap），保证虚拟化命中。
 */
export function StickerGrid({ stickers, onOpen }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const gap = 12; // px
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setContainerWidth(w);
      // 目标：每张图 ~120-180px
      const target = w < 480 ? 96 : w < 768 ? 120 : 150;
      const cols = Math.max(2, Math.floor((w + gap) / (target + gap)));
      setColumns(cols);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemSize =
    columns && containerWidth
      ? Math.floor((containerWidth - gap * (columns - 1)) / columns)
      : 150;
  const rowHeight = itemSize + gap;
  const rowCount = Math.ceil(stickers.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      className="scrollbar-thin min-h-0 flex-1 overflow-auto"
    >
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const start = vRow.index * columns;
          const rowItems = stickers.slice(start, start + columns);
          return (
            <div
              key={vRow.key}
              data-row={vRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: rowHeight,
                transform: `translateY(${vRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${gap}px`,
                paddingBottom: gap,
              }}
            >
              {rowItems.map((s) => (
                <StickerCard key={s.id} sticker={s} onOpen={onOpen} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
