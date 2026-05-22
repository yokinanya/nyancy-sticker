"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Chip, ListBox, Select } from "@heroui/react";
import type { AdminUserRow, Role } from "@/lib/queries/users";
import { changeUserRole } from "@/app/admin/users-actions";

const ROLE_LABEL: Record<Role, string> = {
  user: "用户",
  editor: "管理员",
  admin: "超级管理员",
};
const ROLE_COLOR: Record<Role, "primary" | "secondary" | "soft"> = {
  admin: "primary",
  editor: "secondary",
  user: "soft",
};
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "user", label: "用户" },
  { value: "editor", label: "管理员" },
  { value: "admin", label: "超级管理员" },
];

interface Props {
  items: readonly AdminUserRow[];
  page: number;
  pageCount: number;
  total: number;
  currentUserId: string;
  seedAdmins: readonly string[];
}

export function UsersTable({
  items,
  page,
  pageCount,
  total,
  currentUserId,
  seedAdmins,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    tone: "info" | "success" | "danger";
  } | null>(null);

  const goPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "users");
    params.set("page", String(next));
    router.push(`/admin?${params.toString()}`);
  };

  const submitRole = (userId: string, role: Role) => {
    setMessage(null);
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    startTransition(async () => {
      try {
        await changeUserRole(fd);
        setMessage({ text: `已更新角色为「${ROLE_LABEL[role]}」`, tone: "success" });
        router.refresh();
      } catch (e) {
        setMessage({
          text: e instanceof Error ? e.message : "操作失败。",
          tone: "danger",
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg border border-default-200 bg-content1">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-default-200 text-xs text-default-500">
            <tr>
              <th className="p-3">用户</th>
              <th className="p-3">GitHub</th>
              <th className="p-3">注册时间</th>
              <th className="p-3">当前角色</th>
              <th className="p-3">修改角色</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-default-400">
                  暂无用户。
                </td>
              </tr>
            ) : (
              items.map((u) => {
                const isSelf = u.id === currentUserId;
                const isSeed = !!u.githubLogin && seedAdmins.includes(u.githubLogin);
                const locked = isSelf || isSeed;
                return (
                  <tr key={u.id} className="border-b border-default-100 last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt={u.name ?? u.githubLogin ?? "用户"}
                            className="h-8 w-8 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-default-200 text-xs">
                            {(u.name ?? u.githubLogin ?? "?").slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="font-medium">{u.name ?? "（未填名字）"}</div>
                          {u.email ? (
                            <div className="text-xs text-default-400">{u.email}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      {u.githubLogin ? `@${u.githubLogin}` : "—"}
                    </td>
                    <td className="p-3 text-xs text-default-500">
                      {new Date(u.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="p-3">
                      <Chip size="sm" variant={ROLE_COLOR[u.role]}>
                        <Chip.Label>{ROLE_LABEL[u.role]}</Chip.Label>
                      </Chip>
                    </td>
                    <td className="p-3">
                      {locked ? (
                        <span className="text-xs text-default-400">
                          {isSelf ? "不能修改自己" : "受环境变量保护"}
                        </span>
                      ) : (
                        <RoleSelector
                          value={u.role}
                          disabled={pending}
                          onChange={(role) => submitRole(u.id, role)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {message ? (
        <p
          className={`text-sm ${
            message.tone === "success"
              ? "text-success"
              : message.tone === "danger"
                ? "text-danger"
                : "text-default-500"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-default-500">
        <span>
          第 {page} / {pageCount} 页 · 共 {total} 位用户
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page <= 1}
            onPress={() => goPage(page - 1)}
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page >= pageCount}
            onPress={() => goPage(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

function RoleSelector({
  value,
  disabled,
  onChange,
}: {
  value: Role;
  disabled: boolean;
  onChange: (role: Role) => void;
}) {
  return (
    <Select
      aria-label="角色"
      selectedKey={value}
      isDisabled={disabled}
      onSelectionChange={(key) => {
        const next = String(key) as Role;
        if (next !== value) onChange(next);
      }}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {ROLE_OPTIONS.map((o) => (
            <ListBox.Item key={o.value} id={o.value} textValue={o.label}>
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
