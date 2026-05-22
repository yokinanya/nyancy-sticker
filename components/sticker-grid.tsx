"use client";

import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { StickerCard } from "./sticker-card";
import type { Sticker } from "@/lib/types";

const GRID_GAP = 12;
const DEFAULT_ITEM_SIZE = 150;
const COMPACT_BREAKPOINT = 480;
const MEDIUM_BREAKPOINT = 768;
const COMPACT_TARGET_SIZE = 96;
const MEDIUM_TARGET_SIZE = 120;
const LARGE_TARGET_SIZE = 150;

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
  const [containerWidth, setContainerWidth] = useState(0);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setContainerWidth(w);
      setColumns(getColumnCount(w));
      setScrollMargin(el.offsetTop);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemSize =
    columns && containerWidth
      ? Math.floor((containerWidth - GRID_GAP * (columns - 1)) / columns)
      : DEFAULT_ITEM_SIZE;
  const rowHeight = itemSize + GRID_GAP;
  const rowCount = Math.ceil(stickers.length / columns);

  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => rowHeight,
    overscan: 4,
    scrollMargin,
  });

  return (
    <div ref={parentRef} className="min-h-[40vh] w-full">
      <div
        style={{
          height: rowVirtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        <VirtualRows
          rows={rowVirtualizer.getVirtualItems()}
          stickers={stickers}
          columns={columns}
          rowHeight={rowHeight}
          scrollMargin={scrollMargin}
          onOpen={onOpen}
        />
      </div>
    </div>
  );
}

function getColumnCount(width: number) {
  const target =
    width < COMPACT_BREAKPOINT
      ? COMPACT_TARGET_SIZE
      : width < MEDIUM_BREAKPOINT
        ? MEDIUM_TARGET_SIZE
        : LARGE_TARGET_SIZE;
  return Math.max(2, Math.floor((width + GRID_GAP) / (target + GRID_GAP)));
}

function VirtualRows({
  rows,
  stickers,
  columns,
  rowHeight,
  scrollMargin,
  onOpen,
}: {
  rows: VirtualItem[];
  stickers: readonly Sticker[];
  columns: number;
  rowHeight: number;
  scrollMargin: number;
  onOpen: (s: Sticker) => void;
}) {
  return rows.map((row) => {
    const start = row.index * columns;
    const rowItems = stickers.slice(start, start + columns);
    return (
      <div
        key={row.key}
        data-row={row.index}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: rowHeight,
          transform: `translateY(${row.start - scrollMargin}px)`,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${GRID_GAP}px`,
          paddingBottom: GRID_GAP,
        }}
      >
        {rowItems.map((sticker) => (
          <StickerCard key={sticker.id} sticker={sticker} onOpen={onOpen} />
        ))}
      </div>
    );
  });
}
