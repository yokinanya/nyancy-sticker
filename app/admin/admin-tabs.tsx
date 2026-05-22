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
      <Tabs.List aria-label="后台管理">
        {tabs.map((t) => (
          <Tabs.Tab key={t.key} id={t.key}>
            {t.key === "submissions" && pendingCount > 0
              ? `${t.title} · ${pendingCount}`
              : t.title}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
