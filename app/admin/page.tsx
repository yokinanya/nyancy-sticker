import { Suspense, type ReactNode } from "react";
import { requireEditor } from "@/lib/auth-helpers";
import { countByStatus } from "@/lib/queries/admin-stickers";
import type { AdminTab } from "./admin-tabs";
import { AdminClientShell } from "./admin-client-shell";
import { SubmissionsPanel } from "./panels/submissions-panel";
import { StickersPanel } from "./panels/stickers-panel";
import { CategoriesPanel } from "./panels/categories-panel";
import { TagsPanel } from "./panels/tags-panel";
import { UploadFormPanel } from "./panels/upload-form-panel";
import { UsersPanel } from "./panels/users-panel";

export const metadata = {
  title: "后台管理 - 猫猫冲表情站",
};

const BASE_TABS: readonly AdminTab[] = [
  "submissions",
  "stickers",
  "categories",
  "tags",
  "upload",
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await requireEditor();
  const isAdmin = session.user.role === "admin";

  const sp = await searchParams;
  const rawTab = single(sp.tab);
  const validTabs: readonly AdminTab[] = isAdmin ? [...BASE_TABS, "users"] : BASE_TABS;
  const tab: AdminTab = (validTabs as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as AdminTab)
    : "submissions";
  const counts = await countByStatus();

  return (
    <div className="motion-page admin-shell">
      <AdminClientShell
        initialTab={tab}
        pendingCount={counts.pending}
        isAdmin={isAdmin}
        panels={{
          submissions: panelSlot("submissions", <SubmissionsPanel />),
          stickers: panelSlot("stickers", <StickersPanel searchParams={sp} />),
          categories: panelSlot("categories", <CategoriesPanel />),
          tags: panelSlot("tags", <TagsPanel />),
          upload: panelSlot("upload", <UploadFormPanel />),
          ...(isAdmin ? { users: panelSlot("users", <UsersPanel searchParams={sp} />) } : {}),
        }}
      />
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function panelSlot(tab: AdminTab, children: ReactNode) {
  return <Suspense fallback={<AdminPanelLoading tab={tab} />}>{children}</Suspense>;
}

function AdminPanelLoading({ tab }: { tab: AdminTab }) {
  const label = panelLoadingLabel(tab);
  return (
    <div className="admin-panel flex flex-col gap-3 p-4" aria-live="polite">
      <div>
        <div className="h-4 w-24 animate-pulse rounded bg-default-100" />
        <p className="mt-2 text-sm text-default-500">{label}</p>
      </div>
      <div className="grid gap-2">
        <div className="h-10 animate-pulse rounded-lg bg-default-100" />
        <div className="h-10 animate-pulse rounded-lg bg-default-100" />
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-default-100" />
      </div>
    </div>
  );
}

function panelLoadingLabel(tab: AdminTab) {
  const labels: Record<AdminTab, string> = {
    submissions: "正在加载投稿审核...",
    stickers: "正在加载贴纸列表...",
    categories: "正在加载分类...",
    tags: "正在加载标签...",
    upload: "正在加载上传面板...",
    users: "正在加载用户列表...",
  };
  return labels[tab];
}
