import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Session } from "next-auth";

export async function requireUser(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

/** editor 或 admin 都可进入。用于「进后台、上传、审核、编辑贴纸/分类/标签」等场景。 */
export async function requireEditor(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "editor" && session.user.role !== "admin") redirect("/");
  return session;
}

/** 仅 admin（最高级）。用于「用户管理」等敏感操作。 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/");
  return session;
}
