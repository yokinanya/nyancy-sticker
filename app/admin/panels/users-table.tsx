"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button, Chip, ListBox, Select } from "@heroui/react";
import type { AdminUserRow, Role } from "@/lib/queries/users";
import { changeUserRole } from "@/app/admin/users-actions";
import { useFeedback } from "@/components/feedback";

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
  const feedback = useFeedback();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const goPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "users");
    params.set("page", String(next));
    router.push(`/admin?${params.toString()}`);
  };

  const submitRole = (userId: string, role: Role) => {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("role", role);
    startTransition(async () => {
      try {
        await changeUserRole(fd);
        feedback.success(`已更新角色为「${ROLE_LABEL[role]}」`);
        router.refresh();
      } catch (e) {
        feedback.error(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="mobile-card-list">
        {items.length === 0 ? (
          <p className="admin-panel p-6 text-center text-sm text-default-400">暂无用户。</p>
        ) : (
          items.map((u) => (
            <UserMobileCard
              key={u.id}
              user={u}
              currentUserId={currentUserId}
              seedAdmins={seedAdmins}
              pending={pending}
              onChangeRole={submitRole}
            />
          ))
        )}
      </div>

      <div className="desktop-table-wrap overflow-x-auto rounded-lg border border-default-200 bg-content1">
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
                  <tr
                    key={u.id}
                    className="motion-list-item border-b border-default-100 last:border-0 hover:bg-default-50 dark:hover:bg-default-100/5"
                  >
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
                      <GithubLogin login={u.githubLogin} />
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

      <div className="admin-toolbar flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-default-500">
        <span>
          第 {page} / {pageCount} 页 · 共 {total} 位用户
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page <= 1}
            onPress={() => goPage(page - 1)}
            className="motion-press"
          >
            上一页
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isDisabled={page >= pageCount}
            onPress={() => goPage(page + 1)}
            className="motion-press"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserMobileCard({
  user,
  currentUserId,
  seedAdmins,
  pending,
  onChangeRole,
}: {
  user: AdminUserRow;
  currentUserId: string;
  seedAdmins: readonly string[];
  pending: boolean;
  onChangeRole: (userId: string, role: Role) => void;
}) {
  const isSelf = user.id === currentUserId;
  const isSeed = !!user.githubLogin && seedAdmins.includes(user.githubLogin);
  const locked = isSelf || isSeed;
  return (
    <article className="motion-list-item admin-panel p-3">
      <div className="flex items-start gap-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name ?? user.githubLogin ?? "用户"}
            className="h-10 w-10 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-default-200 text-sm">
            {(user.name ?? user.githubLogin ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium">{user.name ?? "（未填名字）"}</h3>
          <div className="mt-1 text-xs text-default-500">
            <GithubLogin login={user.githubLogin} compact /> ·{" "}
            <span>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          {user.email ? <p className="mt-1 truncate text-xs text-default-400">{user.email}</p> : null}
        </div>
        <Chip size="sm" variant={ROLE_COLOR[user.role]}>
          <Chip.Label>{ROLE_LABEL[user.role]}</Chip.Label>
        </Chip>
      </div>
      <div className="mt-3 border-t border-default-100 pt-3">
        {locked ? (
          <span className="text-xs text-default-400">
            {isSelf ? "不能修改自己" : "受环境变量保护"}
          </span>
        ) : (
          <RoleSelector
            value={user.role}
            disabled={pending}
            onChange={(role) => onChangeRole(user.id, role)}
          />
        )}
      </div>
    </article>
  );
}

function GithubLogin({
  login,
  compact = false,
}: {
  login: string | null;
  compact?: boolean;
}) {
  if (login) return <span>@{login}</span>;
  return (
    <span className="text-warning">
      {compact ? "未写入 GitHub login" : "未写入 GitHub login，重新 GitHub 登录后会补写"}
    </span>
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
      <Select.Trigger className="field-trigger">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="motion-popover popover-surface">
        <ListBox>
          {ROLE_OPTIONS.map((o) => (
            <ListBox.Item
              key={o.value}
              id={o.value}
              textValue={o.label}
              className="listbox-option"
            >
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
