"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { changeUserRole } from "@/app/admin/users-actions";
import { useFeedback } from "@/components/feedback";
import { Button, Chip } from "@/components/ui/heroui-compat";
import type { AdminUserRow, Role } from "@/lib/queries/users";
import { ROLE_COLOR, ROLE_LABEL, UserRoleSelector } from "./user-role-selector";

interface Props {
  readonly items: readonly AdminUserRow[];
  readonly page: number;
  readonly pageCount: number;
  readonly total: number;
  readonly currentUserId: string;
  readonly seedAdmins: readonly string[];
}

export function UsersTable(props: Props) {
  const controller = useUsersTable();
  return (
    <div className="flex flex-col gap-3">
      <UsersMobileList {...props} {...controller} />
      <UsersDesktopTable {...props} {...controller} />
      <UsersPagination {...props} onPage={controller.goPage} />
    </div>
  );
}

function useUsersTable() {
  const router = useRouter();
  const feedback = useFeedback();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const goPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.delete("tab");
    params.set("page", String(page));
    router.push(`/admin/users?${params.toString()}`);
  };
  const submitRole = (userId: string, role: Role) => {
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("role", role);
    startTransition(async () => {
      try {
        await changeUserRole(formData);
        feedback.success(`已更新角色为「${ROLE_LABEL[role]}」`);
        router.refresh();
      } catch (error) {
        feedback.error(error instanceof Error ? error.message : "操作失败。");
      }
    });
  };
  return { goPage, pending, submitRole };
}

interface UserListProps extends Props {
  readonly pending: boolean;
  readonly submitRole: (userId: string, role: Role) => void;
}

function UsersMobileList(props: UserListProps) {
  return (
    <div className="mobile-card-list">
      {props.items.length === 0 ? <EmptyUsers panel /> : props.items.map((user) => (
        <UserMobileCard key={user.id} user={user} currentUserId={props.currentUserId}
          seedAdmins={props.seedAdmins} pending={props.pending} onChangeRole={props.submitRole} />
      ))}
    </div>
  );
}

function UsersDesktopTable(props: UserListProps) {
  return (
    <div className="desktop-table-wrap overflow-x-auto rounded-lg border border-default-200 bg-content1">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-default-200 text-xs text-default-500">
          <tr><th className="p-3">用户</th><th className="p-3">GitHub</th><th className="p-3">注册时间</th><th className="p-3">当前角色</th><th className="p-3">修改角色</th></tr>
        </thead>
        <tbody>
          {props.items.length === 0 ? <EmptyUsers /> : props.items.map((user) => (
            <UserDesktopRow key={user.id} user={user} currentUserId={props.currentUserId}
              seedAdmins={props.seedAdmins} pending={props.pending} onChangeRole={props.submitRole} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserDesktopRow(props: UserCardProps) {
  const reason = roleLockReason(props.user, props.currentUserId, props.seedAdmins);
  return (
    <tr className="motion-list-item border-b border-default-100 last:border-0 hover:bg-default-50 dark:hover:bg-default-100/5">
      <td className="p-3"><UserIdentity user={props.user} compact={false} /></td>
      <td className="p-3 text-xs"><GithubLogin login={props.user.githubLogin} /></td>
      <td className="p-3 text-xs text-default-500">{new Date(props.user.createdAt).toLocaleString("zh-CN")}</td>
      <td className="p-3"><RoleChip role={props.user.role} /></td>
      <td className="p-3"><RoleControl user={props.user} pending={props.pending} reason={reason} onChangeRole={props.onChangeRole} /></td>
    </tr>
  );
}

interface UserCardProps {
  readonly user: AdminUserRow;
  readonly currentUserId: string;
  readonly seedAdmins: readonly string[];
  readonly pending: boolean;
  readonly onChangeRole: (userId: string, role: Role) => void;
}

function UserMobileCard(props: UserCardProps) {
  const reason = roleLockReason(props.user, props.currentUserId, props.seedAdmins);
  return (
    <article className="motion-list-item admin-panel p-3">
      <div className="flex items-start gap-3">
        <UserIdentity user={props.user} compact />
        <RoleChip role={props.user.role} />
      </div>
      <div className="mt-3 border-t border-default-100 pt-3">
        <RoleControl user={props.user} pending={props.pending} reason={reason} onChangeRole={props.onChangeRole} />
      </div>
    </article>
  );
}

function UserIdentity({ compact, user }: { readonly compact: boolean; readonly user: AdminUserRow }) {
  return (
    <><UserAvatar user={user} compact={compact} /><div className="min-w-0 flex-1">
      <div className="truncate font-medium">{user.name ?? "（未填名字）"}</div>
      {compact ? <div className="mt-1 text-xs text-default-500"><GithubLogin login={user.githubLogin} compact /> · {new Date(user.createdAt).toLocaleDateString("zh-CN")}</div> : null}
      {user.email ? <div className="truncate text-xs text-default-400">{user.email}</div> : null}
    </div></>
  );
}

function UserAvatar({ compact, user }: { readonly compact: boolean; readonly user: AdminUserRow }) {
  const size = compact ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  if (!user.image) return <span className={`flex ${size} items-center justify-center rounded-full bg-default-200`}>{(user.name ?? user.githubLogin ?? "?").slice(0, 1).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={user.image} alt={user.name ?? user.githubLogin ?? "用户"} className={`${size} rounded-full`} referrerPolicy="no-referrer" />;
}

function RoleControl(options: { readonly user: AdminUserRow; readonly pending: boolean; readonly reason: string | null; readonly onChangeRole: (userId: string, role: Role) => void }) {
  if (options.reason) return <span className="text-xs text-default-400">{options.reason}</span>;
  return <UserRoleSelector value={options.user.role} disabled={options.pending} onChange={(role) => options.onChangeRole(options.user.id, role)} />;
}

function RoleChip({ role }: { readonly role: Role }) {
  return <Chip size="sm" variant={ROLE_COLOR[role]}><Chip.Label>{ROLE_LABEL[role]}</Chip.Label></Chip>;
}

function UsersPagination(props: Props & { readonly onPage: (page: number) => void }) {
  return (
    <div className="admin-toolbar flex flex-wrap items-center justify-between gap-2 p-3 text-sm text-default-500">
      <span>第 {props.page} / {props.pageCount} 页 · 共 {props.total} 位用户</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" isDisabled={props.page <= 1} onPress={() => props.onPage(props.page - 1)} className="motion-press">上一页</Button>
        <Button size="sm" variant="ghost" isDisabled={props.page >= props.pageCount} onPress={() => props.onPage(props.page + 1)} className="motion-press">下一页</Button>
      </div>
    </div>
  );
}

function EmptyUsers({ panel = false }: { readonly panel?: boolean }) {
  if (panel) return <p className="admin-panel p-6 text-center text-sm text-default-400">暂无用户。</p>;
  return <tr><td colSpan={5} className="p-6 text-center text-default-400">暂无用户。</td></tr>;
}

function roleLockReason(user: AdminUserRow, currentUserId: string, seedAdmins: readonly string[]) {
  if (user.id === currentUserId) return "不能修改自己";
  return user.githubLogin && seedAdmins.includes(user.githubLogin) ? "受环境变量保护" : null;
}

function GithubLogin({ login, compact = false }: { readonly login: string | null; readonly compact?: boolean }) {
  if (login) return <span>@{login}</span>;
  return <span className="text-warning">{compact ? "未写入 GitHub login" : "未写入 GitHub login，重新 GitHub 登录后会补写"}</span>;
}
