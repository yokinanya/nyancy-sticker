"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/auth-helpers";

const VALID_ROLES = ["user", "editor", "admin"] as const;
type Role = (typeof VALID_ROLES)[number];

const SEED_ADMINS = (process.env.ADMIN_GITHUB_LOGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function changeUserRole(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const userId = readText(formData, "userId");
  const role = readText(formData, "role");
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    throw new Error(`无效的角色：${role}`);
  }

  if (userId === session.user.id) {
    throw new Error("不能修改自己的角色。");
  }

  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!target) throw new Error("用户不存在。");

  // 环境变量种子的 admin 不允许降级（重新登录会被强制对齐回 admin，避免不一致）。
  if (
    target.githubLogin &&
    SEED_ADMINS.includes(target.githubLogin) &&
    role !== "admin"
  ) {
    throw new Error(
      `@${target.githubLogin} 在 ADMIN_GITHUB_LOGINS 环境变量里，无法在后台降级。要降级请先从环境变量移除并让其重新登录。`,
    );
  }

  await db
    .update(users)
    .set({ role: role as Role })
    .where(eq(users.id, userId));

  revalidatePath("/admin");
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少字段：${key}`);
  }
  return value.trim();
}
