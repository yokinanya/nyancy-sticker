"use client";

import { Check } from "lucide-react";
import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const CheckboxContext = createContext<{ selected: boolean } | null>(null);

export const Checkbox = Object.assign(
  function Checkbox({
    children,
    isSelected = false,
    onChange,
    ...props
  }: {
    children: ReactNode;
    isSelected?: boolean;
    onChange?: (selected: boolean) => void;
    "aria-label"?: string;
  }) {
    return (
      <CheckboxContext.Provider value={{ selected: isSelected }}>
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          onClick={() => onChange?.(!isSelected)}
          {...props}
        >
          {children}
        </button>
      </CheckboxContext.Provider>
    );
  },
  {
    Control({ className }: HTMLAttributes<HTMLSpanElement>) {
      return (
        <span
          className={cn(
            "ui-focus flex h-4 w-4 items-center justify-center rounded border border-default-300",
            className,
          )}
        >
          <Checkbox.Indicator />
        </span>
      );
    },
    Indicator() {
      const ctx = useContext(CheckboxContext);
      return ctx?.selected ? <Check className="h-3 w-3 text-sky-600" aria-hidden="true" /> : null;
    },
  },
);
