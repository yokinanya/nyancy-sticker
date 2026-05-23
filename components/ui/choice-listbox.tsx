"use client";

import { useLayoutEffect, type HTMLAttributes, type Key } from "react";
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
      textValue,
    }: HTMLAttributes<HTMLButtonElement> & { id: Key; textValue?: string }) {
      const choice = useChoice();
      const label = textValue ?? String(children);
      const selected = String(choice.selectedKey) === String(id);
      useLayoutEffect(() => choice.register(id, label), [choice, id, label]);
      return (
        <button
          type="button"
          role="option"
          aria-selected={selected}
          data-selected={selected ? "true" : undefined}
          className={className}
          onClick={() => choice.select(id, label)}
        >
          {children}
        </button>
      );
    },
  },
);
