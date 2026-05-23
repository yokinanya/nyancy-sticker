"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  panels: Partial<Record<AdminTab, ReactNode>>;
}

export function AdminClientShell({ initialTab, pendingCount, isAdmin, panels }: Props) {
  const [selectedTab, setSelectedTab] = useState(initialTab);
  const tabs = useMemo(() => (isAdmin ? [...BASE_TABS, USERS_TAB] : BASE_TABS), [isAdmin]);

  useEffect(() => {
    setSelectedTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const syncFromUrl = () => {
      const nextTab = new URLSearchParams(window.location.search).get("tab");
      if (isAdminTab(nextTab, isAdmin)) setSelectedTab(nextTab);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [isAdmin]);

  const selectTab = (nextTab: AdminTab) => {
    if (nextTab === selectedTab) return;
    setSelectedTab(nextTab);
    window.history.pushState(null, "", `/admin?tab=${nextTab}`);
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
        {tabs.map((item) => (
          <div key={item.key} hidden={selectedTab !== item.key}>
            {panels[item.key]}
          </div>
        ))}
      </section>
    </>
  );
}

function isAdminTab(value: string | null, isAdmin: boolean): value is AdminTab {
  if (!value) return false;
  if (value === "users" && !isAdmin) return false;
  return BASE_TABS.some((item) => item.key === value) || value === "users";
}
