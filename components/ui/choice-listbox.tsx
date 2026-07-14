"use client";

import { type HTMLAttributes, type Key } from "react";
import { useChoice } from "./choice";
import { cn } from "@/lib/utils";

export const ListBox = Object.assign(
  function ListBox({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div role="listbox" className={cn("grid gap-1", className)} {...props} />;
  },
  {
    Item({
      children,
      className,
      id,
    }: HTMLAttributes<HTMLButtonElement> & { id: Key }) {
      const choice = useChoice();
      const selected = String(choice.selectedKey) === String(id);
      return (
        <button
          type="button"
          role="option"
          aria-selected={selected}
          data-selected={selected ? "true" : undefined}
          className={className}
          onClick={() => choice.select(id)}
        >
          {children}
        </button>
      );
    },
  },
);
