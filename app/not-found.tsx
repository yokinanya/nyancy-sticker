import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h2 className="text-xl font-semibold">页面不存在</h2>
      <p className="text-sm text-default-500">
        你访问的角色或路径可能已被删除或拼写有误。
      </p>
      <Link
        href="/"
        className="motion-press rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
      >
        返回首页
      </Link>
    </div>
  );
}
