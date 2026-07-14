import { Suspense } from "react";
import { UsersPanel } from "../panels/users-panel";
import { AdminPanelLoading } from "../panel-loading";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function UsersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminPanelLoading tab="users" />}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({ searchParams }: PageProps) {
  return <UsersPanel searchParams={await searchParams} />;
}
