export const CHOICE_POPOVER_WIDTH_VAR = "--choice-trigger-width";

const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;
const DEFAULT_POPOVER_HEIGHT = 192;

export type ChoiceAlign = "start" | "end";
export type ChoiceSide = "auto" | "bottom" | "top";

export type PopoverPosition = {
  bottom?: number;
  left: number;
  maxHeight: number;
  top?: number;
  width: number;
};

export function getPopoverPosition(
  anchor: HTMLDivElement | null,
  align: ChoiceAlign,
  side: ChoiceSide,
): PopoverPosition {
  const rect = anchor?.getBoundingClientRect();
  const width = rect?.width ?? DEFAULT_POPOVER_HEIGHT;
  const leftBase = align === "end" && rect ? rect.right - width : (rect?.left ?? VIEWPORT_PADDING);
  const below = window.innerHeight - (rect?.bottom ?? 0) - POPOVER_GAP - VIEWPORT_PADDING;
  const above = (rect?.top ?? 0) - POPOVER_GAP - VIEWPORT_PADDING;
  const placeTop = side === "top" || (side === "auto" && shouldPlaceTop(below, above));
  const left = clamp(leftBase, VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const maxHeight = Math.max(120, placeTop ? above : below);
  if (placeTop) return { bottom: window.innerHeight - (rect?.top ?? 0) + POPOVER_GAP, left, maxHeight, width };
  return { left, maxHeight, top: (rect?.bottom ?? VIEWPORT_PADDING) + POPOVER_GAP, width };
}

function shouldPlaceTop(below: number, above: number) {
  return below < DEFAULT_POPOVER_HEIGHT && above > below;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
