"use client";

import { Input } from "@heroui/react";
import { useEffect, useState } from "react";

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
}

export function SearchBar({ query, onQueryChange }: Props) {
  const [local, setLocal] = useState(query);

  useEffect(() => {
    const id = setTimeout(() => onQueryChange(local), 200);
    return () => clearTimeout(id);
  }, [local, onQueryChange]);

  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </span>
      <Input
        aria-label="搜索表情包"
        type="search"
        placeholder="搜索名称 / 标签 / 分类"
        className="field-control w-full !pl-10"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}
