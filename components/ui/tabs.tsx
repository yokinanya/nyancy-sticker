"use client";

import { createContext, useContext, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type TabsContextValue = {
  selectedKey: React.Key | null;
  onSelectionChange?: (key: React.Key) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export const Tabs = Object.assign(
  function Tabs({
    children,
    selectedKey = null,
    onSelectionChange,
  }: {
    children: ReactNode;
    selectedKey?: React.Key | null;
    onSelectionChange?: (key: React.Key) => void;
    "aria-label"?: string;
  }) {
    return (
      <TabsContext.Provider value={{ selectedKey, onSelectionChange }}>
        {children}
      </TabsContext.Provider>
    );
  },
  {
    List({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
      return <div role="tablist" className={cn("flex gap-1", className)} {...props} />;
    },
    Tab({ className, id, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { id: string }) {
      const tabs = useContext(TabsContext);
      const selected = String(tabs?.selectedKey) === id;
      return (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          data-selected={selected ? "true" : undefined}
          onClick={() => tabs?.onSelectionChange?.(id)}
          className={className}
          {...props}
        />
      );
    },
  },
);
