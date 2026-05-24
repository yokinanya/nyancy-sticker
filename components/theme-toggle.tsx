"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/heroui-compat";
import { cn } from "@/lib/utils";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeOption = {
  readonly value: ThemeMode;
  readonly label: string;
  readonly Icon: LucideIcon;
};

const THEME_LABELS = {
  system: "跟随系统",
  light: "浅色模式",
  dark: "深色模式",
} as const satisfies Record<ThemeMode, string>;

const THEME_OPTIONS = [
  { value: "system", label: THEME_LABELS.system, Icon: Monitor },
  { value: "light", label: THEME_LABELS.light, Icon: Sun },
  { value: "dark", label: THEME_LABELS.dark, Icon: Moon },
] as const satisfies readonly ThemeOption[];

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  useThemeMenuDismiss(open, setOpen, menuRef);

  const activeTheme = mounted ? (theme as ThemeMode) : "system";
  const resolvedMode = mounted ? (resolvedTheme as ResolvedTheme | undefined) : "light";
  const TriggerIcon = activeTheme === "system" ? Monitor : resolvedMode === "dark" ? Moon : Sun;

  const selectTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        isIconOnly
        variant="ghost"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`主题：${THEME_LABELS[activeTheme]}`}
        onPress={() => setOpen((value) => !value)}
        className="motion-press"
      >
        <TriggerIcon className="h-5 w-5" aria-hidden="true" />
      </Button>
      {open ? <ThemeMenu activeTheme={activeTheme} onSelect={selectTheme} /> : null}
    </div>
  );
}

function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return mounted;
}

function useThemeMenuDismiss(
  open: boolean,
  setOpen: (open: boolean) => void,
  menuRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuRef, open, setOpen]);
}

function ThemeMenu({
  activeTheme,
  onSelect,
}: {
  activeTheme: ThemeMode;
  onSelect: (theme: ThemeMode) => void;
}) {
  return (
    <div
      role="menu"
      aria-label="主题模式"
      className="motion-popover solid-menu-surface absolute right-0 z-50 mt-2 w-40"
    >
      {THEME_OPTIONS.map((option) => (
        <ThemeOptionButton
          key={option.value}
          option={option}
          selected={activeTheme === option.value}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function ThemeOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: ThemeOption;
  selected: boolean;
  onSelect: (theme: ThemeMode) => void;
}) {
  const { Icon } = option;

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={() => onSelect(option.value)}
      className={cn(
        "motion-interactive ui-focus flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-default-100",
        selected ? "text-primary" : "text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{option.label}</span>
      {selected ? <Check className="h-4 w-4 flex-none" aria-hidden="true" /> : null}
    </button>
  );
}
