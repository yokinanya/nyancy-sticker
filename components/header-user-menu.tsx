"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/react";

interface Props {
  user: {
    name: string;
    image: string | null;
    role: "user" | "editor" | "admin";
    githubLogin: string | null;
  };
  logoutAction: () => Promise<void>;
}

export function HeaderUserMenu({ user, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="motion-interactive ui-focus flex items-center gap-2 rounded-full border border-default-200 px-2 py-1 text-sm transition hover:bg-default-100"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name}
            width={24}
            height={24}
            className="h-6 w-6 rounded-full"
            referrerPolicy="no-referrer"
            unoptimized
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-default-200 text-xs">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden md:inline">{user.name}</span>
      </button>
      {open ? (
        <div className="motion-popover popover-surface absolute right-0 z-50 mt-2 w-44">
          <div className="border-b border-default-100 px-3 py-2 text-xs text-default-500">
            {user.githubLogin ? `@${user.githubLogin}` : user.name}
            {user.role === "admin" ? (
              <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] text-primary">超管</span>
            ) : user.role === "editor" ? (
              <span className="ml-1 rounded bg-secondary/10 px-1 text-[10px] text-secondary">管理员</span>
            ) : null}
          </div>
          <MenuLink href="/submit" label="投稿表情包" onClick={() => setOpen(false)} />
          {user.role === "admin" || user.role === "editor" ? (
            <MenuLink href="/admin" label="后台管理" onClick={() => setOpen(false)} />
          ) : null}
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" className="motion-interactive w-full justify-start">
              登出
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="motion-interactive ui-focus block rounded px-3 py-2 text-sm hover:bg-default-100"
    >
      {label}
    </Link>
  );
}
