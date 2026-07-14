"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@/components/ui/heroui-compat";
import { ADMIN_TAB_ROUTES, type AdminTab } from "./admin-tabs";

const BASE_TABS = [
  { key: "submissions", title: "投稿审核" },
  { key: "stickers", title: "贴纸" },
  { key: "duplicates", title: "查重" },
  { key: "categories", title: "分类" },
  { key: "upload", title: "上传" },
] as const;
const ADMIN_TABS = [
  { key: "notice", title: "公告" },
  { key: "users", title: "用户" },
] as const;

interface Props {
  readonly pendingCount: number;
  readonly isAdmin: boolean;
}

export function AdminNavigation({ pendingCount, isAdmin }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = useMemo(
    () => (isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS),
    [isAdmin],
  );
  return (
    <div className="min-w-0">
      <Tabs
        aria-label="后台管理"
        selectedKey={selectedTab(pathname)}
        onSelectionChange={(key) => router.push(ADMIN_TAB_ROUTES[String(key) as AdminTab])}
      >
        <Tabs.List aria-label="后台管理" className="admin-tab-list">
          {tabs.map((item) => (
            <Tabs.Tab key={item.key} id={item.key} className="admin-tab ui-focus">
              <span className="admin-tab-label">{item.title}</span>
              {item.key === "submissions" && pendingCount > 0 ? (
                <span className="admin-tab-badge" aria-label={`${pendingCount} 条待审核投稿`}>
                  {pendingCount}
                </span>
              ) : null}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </div>
  );
}

function selectedTab(pathname: string): AdminTab {
  const match = Object.entries(ADMIN_TAB_ROUTES).find(([, path]) => path === pathname);
  return (match?.[0] as AdminTab | undefined) ?? "submissions";
}
