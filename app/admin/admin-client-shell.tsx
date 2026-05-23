"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs } from "@heroui/react";
import type { AdminTab } from "./admin-tabs";

const BASE_TABS = [
  { key: "submissions", title: "投稿审核" },
  { key: "stickers", title: "贴纸" },
  { key: "categories", title: "分类" },
  { key: "tags", title: "标签" },
  { key: "upload", title: "上传" },
] as const;

const USERS_TAB = { key: "users", title: "用户" } as const;
const scrollableTabListClass =
  "flex! w-full max-w-full min-w-0 flex-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
const tabClass =
  "motion-press ui-selected-tab w-auto! flex-[1_0_max-content]! whitespace-nowrap rounded-lg px-3 py-2";

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
          <Tabs.List aria-label="后台管理" className={scrollableTabListClass}>
            {tabs.map((item) => (
              <Tabs.Tab key={item.key} id={item.key} className={tabClass}>
                {item.key === "submissions" && pendingCount > 0
                  ? `${item.title} · ${pendingCount}`
                  : item.title}
              </Tabs.Tab>
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
