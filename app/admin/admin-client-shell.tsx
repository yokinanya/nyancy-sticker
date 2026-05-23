"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/heroui-compat";
import type { AdminTab } from "./admin-tabs";

const BASE_TABS = [
  { key: "submissions", title: "投稿审核" },
  { key: "stickers", title: "贴纸" },
  { key: "duplicates", title: "查重" },
  { key: "categories", title: "分类" },
  { key: "upload", title: "上传" },
] as const;

const USERS_TAB = { key: "users", title: "用户" } as const;
const TAB_LIST_CLASS = "admin-tab-list";
const TAB_CLASS = "admin-tab ui-focus";

type AdminTabItem = (typeof BASE_TABS)[number] | typeof USERS_TAB;

function AdminTabButton({ item, pendingCount }: { item: AdminTabItem; pendingCount: number }) {
  const shouldShowPendingBadge = item.key === "submissions" && pendingCount > 0;

  return (
    <Tabs.Tab key={item.key} id={item.key} className={TAB_CLASS}>
      <span className="admin-tab-label">{item.title}</span>
      {shouldShowPendingBadge ? (
        <span className="admin-tab-badge" aria-label={`${pendingCount} 条待审核投稿`}>
          {pendingCount}
        </span>
      ) : null}
    </Tabs.Tab>
  );
}

interface Props {
  initialTab: AdminTab;
  pendingCount: number;
  isAdmin: boolean;
  panel: ReactNode;
}

export function AdminClientShell({ initialTab, pendingCount, isAdmin, panel }: Props) {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const tabs = useMemo(() => (isAdmin ? [...BASE_TABS, USERS_TAB] : BASE_TABS), [isAdmin]);

  const selectTab = (nextTab: AdminTab) => {
    if (nextTab === selectedTab) return;
    setSelectedTab(nextTab);
    router.push(`/admin?tab=${nextTab}`);
  };

  return (
    <>
      <div className="min-w-0">
        <Tabs
          aria-label="后台管理"
          selectedKey={selectedTab}
          onSelectionChange={(key) => selectTab(String(key) as AdminTab)}
        >
          <Tabs.List aria-label="后台管理" className={TAB_LIST_CLASS}>
            {tabs.map((item) => (
              <AdminTabButton key={item.key} item={item} pendingCount={pendingCount} />
            ))}
          </Tabs.List>
        </Tabs>
      </div>

      <section className="min-w-0">
        {panel}
      </section>
    </>
  );
}
