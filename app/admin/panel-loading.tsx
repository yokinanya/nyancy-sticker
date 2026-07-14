import type { AdminTab } from "./admin-tabs";

const LABELS: Readonly<Record<AdminTab, string>> = {
  submissions: "正在加载投稿审核...",
  stickers: "正在加载贴纸列表...",
  duplicates: "正在加载查重结果...",
  categories: "正在加载分类...",
  upload: "正在加载上传面板...",
  notice: "正在加载公告设置...",
  users: "正在加载用户列表...",
};

export function AdminPanelLoading({ tab }: { readonly tab: AdminTab }) {
  return (
    <div className="admin-panel flex flex-col gap-3 p-4" aria-live="polite">
      <p className="text-sm text-default-500">{LABELS[tab]}</p>
      <div className="grid gap-2">
        <div className="h-10 animate-pulse rounded-lg bg-default-100" />
        <div className="h-10 animate-pulse rounded-lg bg-default-100" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-default-100" />
      </div>
    </div>
  );
}
