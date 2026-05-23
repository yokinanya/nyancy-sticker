"use client";

import { useEffect } from "react";
import Link from "next/link";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h2 className="text-xl font-semibold">出错了 _(:з」∠)_</h2>
      <p className="text-sm text-default-500">
        {error.message || "页面加载失败，请稍后再试。"}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="motion-press rounded-md border border-default-200 bg-content1 px-4 py-2 text-sm hover:bg-default-100"
        >
          重试
        </button>
        <Link
          href="/"
          className="motion-press rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
