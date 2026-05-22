import { asc, count, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";

export type Role = "user" | "editor" | "admin";

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  githubLogin: string | null;
  role: Role;
  createdAt: Date;
}

export interface ListUsersResult {
  items: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listUsersPaginated(opts: {
  page: number;
  pageSize: number;
}): Promise<ListUsersResult> {
  const offset = Math.max(0, (opts.page - 1) * opts.pageSize);
  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        githubLogin: users.githubLogin,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt), asc(users.id))
      .limit(opts.pageSize)
      .offset(offset),
    db.select({ c: count() }).from(users),
  ]);
  const total = Number(totalRows[0]?.c ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / opts.pageSize));
  return { items, total, page: opts.page, pageSize: opts.pageSize, pageCount };
}

export async function countByRole(): Promise<Record<Role, number>> {
  const rows = await db
    .select({ role: users.role, c: count() })
    .from(users)
    .groupBy(users.role);
  const result: Record<Role, number> = { user: 0, editor: 0, admin: 0 };
  rows.forEach((r) => {
    result[r.role] = Number(r.c);
  });
  return result;
}
