"use client";

import { useWindowVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";
import { StickerCard } from "./sticker-card";
import type { Sticker } from "@/lib/types";

const GRID_GAP = 12;
const COMPACT_BREAKPOINT = 480;
const MEDIUM_BREAKPOINT = 768;
const COMPACT_TARGET_SIZE = 96;
const MEDIUM_TARGET_SIZE = 120;
const LARGE_TARGET_SIZE = 150;
const MINIMUM_COLUMNS = 2;
const GRID_OVERSCAN_ROWS = 2;

interface Props {
  readonly stickers: readonly Sticker[];
  readonly onOpen: (sticker: Sticker) => void;
  readonly selectedIds?: ReadonlySet<string>;
  readonly isSelectionMode?: boolean;
}

interface GridMeasurement {
  readonly columns: number;
  readonly containerWidth: number;
  readonly scrollMargin: number;
}

export function StickerGrid(props: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<GridMeasurement | null>(null);

  useLayoutEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const measure = () => {
      const next = readMeasurement(element);
      setMeasurement((current) => sameMeasurement(current, next) ? current : next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={parentRef} className="min-h-[40vh] w-full">
      {measurement ? <MeasuredStickerGrid {...props} measurement={measurement} /> : null}
    </div>
  );
}

function MeasuredStickerGrid({
  stickers,
  onOpen,
  selectedIds,
  isSelectionMode = false,
  measurement,
}: Props & { readonly measurement: GridMeasurement }) {
  const itemSize = Math.floor(
    (measurement.containerWidth - GRID_GAP * (measurement.columns - 1)) /
      measurement.columns,
  );
  const rowHeight = itemSize + GRID_GAP;
  const rowVirtualizer = useWindowVirtualizer({
    count: Math.ceil(stickers.length / measurement.columns),
    estimateSize: () => rowHeight,
    overscan: GRID_OVERSCAN_ROWS,
    scrollMargin: measurement.scrollMargin,
  });
  return (
    <div style={{ height: rowVirtualizer.getTotalSize(), width: "100%", position: "relative" }}>
      <VirtualRows
        rows={rowVirtualizer.getVirtualItems()}
        stickers={stickers}
        columns={measurement.columns}
        isSelectionMode={isSelectionMode}
        rowHeight={rowHeight}
        scrollMargin={measurement.scrollMargin}
        selectedIds={selectedIds}
        onOpen={onOpen}
      />
    </div>
  );
}

function readMeasurement(element: HTMLDivElement): GridMeasurement {
  const containerWidth = element.getBoundingClientRect().width;
  return {
    columns: getColumnCount(containerWidth),
    containerWidth,
    scrollMargin: element.getBoundingClientRect().top + window.scrollY,
  };
}

function sameMeasurement(
  current: GridMeasurement | null,
  next: GridMeasurement,
): boolean {
  return Boolean(
    current &&
      current.columns === next.columns &&
      current.containerWidth === next.containerWidth &&
      current.scrollMargin === next.scrollMargin,
  );
}

function getColumnCount(width: number): number {
  const target = width < COMPACT_BREAKPOINT
    ? COMPACT_TARGET_SIZE
    : width < MEDIUM_BREAKPOINT
      ? MEDIUM_TARGET_SIZE
      : LARGE_TARGET_SIZE;
  return Math.max(
    MINIMUM_COLUMNS,
    Math.floor((width + GRID_GAP) / (target + GRID_GAP)),
  );
}

function VirtualRows({
  rows,
  stickers,
  columns,
  isSelectionMode,
  rowHeight,
  scrollMargin,
  selectedIds,
  onOpen,
}: VirtualRowsProps) {
  return rows.map((row) => {
    const start = row.index * columns;
    return (
      <div
        key={row.key}
        data-row={row.index}
        style={rowStyle({ columns, row, rowHeight, scrollMargin })}
      >
        {stickers.slice(start, start + columns).map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            onOpen={onOpen}
            isSelectable={isSelectionMode}
            isSelected={selectedIds?.has(sticker.id) ?? false}
            priority={row.index === 0}
          />
        ))}
      </div>
    );
  });
}

function rowStyle(options: {
  readonly row: VirtualItem;
  readonly rowHeight: number;
  readonly scrollMargin: number;
  readonly columns: number;
}) {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: options.rowHeight,
    transform: `translateY(${options.row.start - options.scrollMargin}px)`,
    display: "grid",
    gridTemplateColumns: `repeat(${options.columns}, minmax(0, 1fr))`,
    gap: GRID_GAP,
    paddingBottom: GRID_GAP,
  } as const;
}

interface VirtualRowsProps {
  readonly rows: VirtualItem[];
  readonly stickers: readonly Sticker[];
  readonly columns: number;
  readonly isSelectionMode: boolean;
  readonly rowHeight: number;
  readonly scrollMargin: number;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onOpen: (sticker: Sticker) => void;
}
