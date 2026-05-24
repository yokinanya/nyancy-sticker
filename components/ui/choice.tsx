"use client";

import { ChevronDown, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  CHOICE_POPOVER_WIDTH_VAR,
  getPopoverPosition,
  type ChoiceAlign,
  type ChoiceSide,
  type PopoverPosition,
} from "./choice-position";
import { cn } from "@/lib/utils";

type ChoiceRootProps = {
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onSelectionChange?: (key: React.Key | null) => void;
  selectedKey?: React.Key | null;
};

type ChoiceContextValue = {
  selectedKey: React.Key | null;
  disabled: boolean;
  open: boolean;
  labelVersion: number;
  popoverId: string;
  rootRef: RefObject<HTMLDivElement | null>;
  labelFor: (key: React.Key | null) => string;
  register: (key: React.Key, label: string) => void;
  select: (key: React.Key | null, label?: string) => void;
  setOpen: (open: boolean) => void;
};

const ChoiceContext = createContext<ChoiceContextValue | null>(null);

export function useChoice() {
  const value = useContext(ChoiceContext);
  if (!value) throw new Error("Choice component must be used inside Select or Autocomplete.");
  return value;
}

function ChoiceRoot({
  children,
  className,
  isDisabled = false,
  onSelectionChange,
  selectedKey = null,
}: ChoiceRootProps) {
  const [open, setOpen] = useState(false);
  const [labelVersion, setLabelVersion] = useState(0);
  const labels = useRef(new Map<string, string>());
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const register = useCallback((key: React.Key, label: string) => {
    const labelKey = String(key);
    if (labels.current.get(labelKey) === label) return;
    labels.current.set(labelKey, label);
    setLabelVersion((value) => value + 1);
  }, []);
  const select = useCallback(
    (key: React.Key | null, label = "") => {
      if (key !== null && label) labels.current.set(String(key), label);
      onSelectionChange?.(key);
      setOpen(false);
    },
    [onSelectionChange],
  );

  useEffect(() => closeOnOutsidePointer(open, rootRef, popoverId, setOpen), [open, popoverId]);

  const value = useMemo<ChoiceContextValue>(
    () => ({
      selectedKey,
      disabled: isDisabled,
      open,
      labelVersion,
      popoverId,
      rootRef,
      labelFor: (key) => (key === null ? "" : (labels.current.get(String(key)) ?? String(key))),
      register,
      select,
      setOpen,
    }),
    [isDisabled, labelVersion, open, popoverId, register, select, selectedKey],
  );

  return (
    <ChoiceContext.Provider value={value}>
      <div ref={rootRef} className={cn("relative w-full", className)}>
        {children}
      </div>
    </ChoiceContext.Provider>
  );
}

function closeOnOutsidePointer(
  open: boolean,
  rootRef: React.RefObject<HTMLDivElement | null>,
  popoverId: string,
  setOpen: (open: boolean) => void,
) {
  if (!open) return;
  const onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    if (rootRef.current?.contains(target)) return;
    if (target.closest(`[data-choice-popover="${popoverId}"]`)) return;
    setOpen(false);
  };
  document.addEventListener("pointerdown", onPointerDown);
  return () => document.removeEventListener("pointerdown", onPointerDown);
}

function SelectTrigger({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const choice = useChoice();
  return (
    <button
      type="button"
      disabled={choice.disabled}
      aria-expanded={choice.open}
      onClick={() => choice.setOpen(!choice.open)}
      className={cn(
        "field-trigger ui-focus flex items-center justify-between gap-2 text-left",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function AutocompleteTrigger({ className, children, onKeyDown, ...props }: HTMLAttributes<HTMLDivElement>) {
  const choice = useChoice();
  const tabIndex = choice.disabled ? -1 : 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || choice.disabled) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choice.setOpen(!choice.open);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      choice.setOpen(true);
      return;
    }
    if (event.key === "Escape") choice.setOpen(false);
  };

  return (
    <div
      role="button"
      tabIndex={tabIndex}
      aria-disabled={choice.disabled || undefined}
      aria-expanded={choice.open}
      aria-haspopup="listbox"
      onClick={(event) => {
        event.stopPropagation();
        if (!choice.disabled) choice.setOpen(!choice.open);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "field-trigger ui-focus flex items-center justify-between gap-2 text-left",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function ChoiceValue({ className }: HTMLAttributes<HTMLSpanElement>) {
  const choice = useChoice();
  return (
    <span className={cn("min-w-0 flex-1 truncate", className)}>
      {choice.labelFor(choice.selectedKey)}
    </span>
  );
}

type ChoicePopoverProps = HTMLAttributes<HTMLDivElement> & {
  align?: ChoiceAlign;
  side?: ChoiceSide;
};

function ChoicePopover({
  align = "start",
  children,
  className,
  side = "auto",
  ...props
}: ChoicePopoverProps) {
  const choice = useChoice();
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  useLayoutEffect(() => {
    if (!choice.open) return;
    const update = () => setPosition(getPopoverPosition(choice.rootRef.current, align, side));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, choice.open, choice.rootRef, side]);

  if (!choice.open) return <div hidden>{children}</div>;
  if (!position) return null;

  const style = {
    [CHOICE_POPOVER_WIDTH_VAR]: `${position.width}px`,
    bottom: position.bottom,
    left: position.left,
    maxHeight: position.maxHeight,
    top: position.top,
  } as CSSProperties;

  return createPortal(
    <div
      className={cn("pointer-events-auto fixed z-[70] min-w-[var(--choice-trigger-width)]", className)}
      data-choice-popover={choice.popoverId}
      style={style}
      {...props}
    >
      {children}
    </div>,
    document.body,
  );
}

export const Select = Object.assign((props: ChoiceRootProps) => <ChoiceRoot {...props} />, {
  Trigger: SelectTrigger,
  Value: ChoiceValue,
  Indicator: ({ className }: HTMLAttributes<SVGSVGElement>) => (
    <ChevronDown className={cn("ml-auto h-4 w-4 flex-none", className)} aria-hidden="true" />
  ),
  Popover: ChoicePopover,
});

export const Autocomplete = Object.assign((props: ChoiceRootProps) => <ChoiceRoot {...props} />, {
  Trigger: AutocompleteTrigger,
  Value: ChoiceValue,
  ClearButton({ className }: ButtonHTMLAttributes<HTMLButtonElement>) {
    const choice = useChoice();
    return (
      <button
        type="button"
        disabled={choice.disabled}
        className={cn("rounded p-1", className)}
        onClick={(event) => {
          event.stopPropagation();
          choice.select(null);
        }}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    );
  },
  Popover: ChoicePopover,
  Filter({ children }: { children: ReactNode }) {
    return children;
  },
});
