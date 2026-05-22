"use client";

import { Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";

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
  "motion-interactive w-auto! flex-[1_0_max-content]! whitespace-nowrap rounded-lg px-3 py-2";

export type AdminTab =
  | (typeof BASE_TABS)[number]["key"]
  | typeof USERS_TAB.key;

interface Props {
  tab: AdminTab;
  pendingCount: number;
  isAdmin: boolean;
}

export function AdminTabs({ tab, pendingCount, isAdmin }: Props) {
  const router = useRouter();
  const tabs = isAdmin ? [...BASE_TABS, USERS_TAB] : BASE_TABS;
  return (
    <Tabs
      aria-label="后台管理"
      selectedKey={tab}
      onSelectionChange={(key) => router.push(`/admin?tab=${String(key)}`)}
    >
      <Tabs.List aria-label="后台管理" className={scrollableTabListClass}>
        {tabs.map((item) => {
          const label =
            item.key === "submissions" && pendingCount > 0
              ? `${item.title} · ${pendingCount}`
              : item.title;
          return (
            <Tabs.Tab
              key={item.key}
              id={item.key}
              className={tabClass}
            >
              {label}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
    </Tabs>
  );
}
