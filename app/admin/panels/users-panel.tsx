import { requireAdmin } from "@/lib/auth-helpers";
import { listUsersPaginated } from "@/lib/queries/users";
import { UsersTable } from "./users-table";

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function UsersPanel({ searchParams }: Props) {
  const session = await requireAdmin();
  const page = Math.max(1, Number.parseInt(single(searchParams.page) ?? "1", 10) || 1);
  const pageSize = 30;

  const result = await listUsersPaginated({ page, pageSize });
  const seedAdmins = (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <UsersTable
      items={result.items}
      page={result.page}
      pageCount={result.pageCount}
      total={result.total}
      currentUserId={session.user.id}
      seedAdmins={seedAdmins}
    />
  );
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
