"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Filter } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { StickerSort } from "@/lib/queries/admin-stickers";

const POPOVER_WIDTH = 288;
const VIEWPORT_GAP = 8;
const MIN_POPOVER_HEIGHT = 160;

type HeaderRender = (close: () => void) => ReactNode;

interface FilterHeaderProps {
  active: boolean;
  asc: StickerSort;
  children: HeaderRender;
  desc: StickerSort;
  label: string;
  onSort: (sort: StickerSort) => void;
  sort: StickerSort;
}

interface PopoverPosition {
  left: number;
  maxHeight: number;
  top: number;
}

export function FilterHeader({
  active,
  asc,
  children,
  desc,
  label,
  onSort,
  sort,
}: FilterHeaderProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isAsc = sort === asc;
  const isDesc = sort === desc;

  const close = () => setOpen(false);
  const toggleFilter = () => {
    if (open) {
      close();
      return;
    }
    setPosition(getPopoverPosition(buttonRef.current));
    setOpen(true);
  };

  usePopoverLifecycle(open, buttonRef, popoverRef, close, () => {
    setPosition(getPopoverPosition(buttonRef.current));
  });

  return (
    <th aria-sort={ariaSort(isAsc, isDesc)} className="p-2 align-top">
      <ColumnHeader
        active={active}
        buttonRef={buttonRef}
        isAsc={isAsc}
        isDesc={isDesc}
        label={label}
        onFilterPress={toggleFilter}
        onSortPress={() => onSort(nextSort(sort, asc, desc))}
        open={open}
      />
      {open && position ? (
        <ViewportPopover label={label} popoverRef={popoverRef} position={position}>
          {children(close)}
        </ViewportPopover>
      ) : null}
    </th>
  );
}

function ColumnHeader({
  active,
  buttonRef,
  isAsc,
  isDesc,
  label,
  onFilterPress,
  onSortPress,
  open,
}: {
  active: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  isAsc: boolean;
  isDesc: boolean;
  label: string;
  onFilterPress: () => void;
  onSortPress: () => void;
  open: boolean;
}) {
  return (
    <div className="inline-flex h-8 items-center gap-1 rounded-md px-1">
      <span className="whitespace-nowrap font-medium text-default-600">{label}</span>
      <SortButton isAsc={isAsc} isDesc={isDesc} label={label} onPress={onSortPress} />
      <FilterButton active={active} buttonRef={buttonRef} label={label} onPress={onFilterPress} open={open} />
    </div>
  );
}

function SortButton({
  isAsc,
  isDesc,
  label,
  onPress,
}: {
  isAsc: boolean;
  isDesc: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}排序`}
      onClick={onPress}
      className={cn(
        "ui-focus inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent",
        "text-default-500 transition hover:bg-primary/8 hover:text-foreground",
        (isAsc || isDesc) && "border-primary/35 bg-primary/10 text-primary",
      )}
    >
      <SortIcon isAsc={isAsc} isDesc={isDesc} />
    </button>
  );
}

function FilterButton({
  active,
  buttonRef,
  label,
  onPress,
  open,
}: {
  active: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  label: string;
  onPress: () => void;
  open: boolean;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`${label}筛选`}
      onClick={onPress}
      className={cn(
        "ui-focus inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent",
        "text-default-500 transition hover:bg-primary/8 hover:text-foreground",
        active && "border-primary/35 bg-primary/10 text-primary",
      )}
    >
      <Filter className={cn("h-3.5 w-3.5", active && "fill-current")} aria-hidden="true" />
    </button>
  );
}

function ViewportPopover({
  children,
  label,
  popoverRef,
  position,
}: {
  children: ReactNode;
  label: string;
  popoverRef: RefObject<HTMLDivElement | null>;
  position: PopoverPosition;
}) {
  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`${label}筛选`}
      className="motion-popover popover-surface fixed z-50 w-72 overflow-auto p-3"
      style={{ left: position.left, maxHeight: position.maxHeight, top: position.top }}
    >
      {children}
    </div>,
    document.body,
  );
}

function SortIcon({ isAsc, isDesc }: { isAsc: boolean; isDesc: boolean }) {
  if (isAsc) return <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />;
  if (isDesc) return <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />;
}

function nextSort(current: StickerSort, asc: StickerSort, desc: StickerSort): StickerSort {
  if (current === asc) return desc;
  if (current === desc) return "grouped";
  return asc;
}

function ariaSort(isAsc: boolean, isDesc: boolean) {
  if (isAsc) return "ascending";
  if (isDesc) return "descending";
  return "none";
}

function getPopoverPosition(trigger: HTMLElement | null): PopoverPosition {
  const rect = trigger?.getBoundingClientRect();
  const fallbackTop = VIEWPORT_GAP;
  if (!rect) return { left: VIEWPORT_GAP, maxHeight: window.innerHeight * 0.7, top: fallbackTop };
  const left = clamp(rect.left, VIEWPORT_GAP, window.innerWidth - POPOVER_WIDTH - VIEWPORT_GAP);
  const belowTop = rect.bottom + VIEWPORT_GAP;
  const availableBelow = window.innerHeight - belowTop - VIEWPORT_GAP;
  if (availableBelow >= MIN_POPOVER_HEIGHT) {
    return { left, maxHeight: Math.min(availableBelow, window.innerHeight * 0.7), top: belowTop };
  }
  const maxHeight = Math.max(MIN_POPOVER_HEIGHT, rect.top - VIEWPORT_GAP * 2);
  return { left, maxHeight: Math.min(maxHeight, window.innerHeight * 0.7), top: VIEWPORT_GAP };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function usePopoverLifecycle(
  open: boolean,
  buttonRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  close: () => void,
  updatePosition: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      if (target.closest("[data-choice-popover]")) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [buttonRef, close, open, popoverRef, updatePosition]);
}
