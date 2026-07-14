import { Suspense, type ReactNode } from "react";
import { requireEditor } from "@/lib/auth-helpers";
import { countPendingStickers } from "@/lib/queries/admin-stickers";
import { AdminNavigation } from "./admin-navigation";

export default function AdminTemplate({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <Suspense fallback={<AdminFrameFallback />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { readonly children: ReactNode }) {
  const [session, pendingCount] = await Promise.all([
    requireEditor(),
    countPendingStickers(),
  ]);
  return (
    <div className="motion-page admin-shell">
      <AdminNavigation
        pendingCount={pendingCount}
        isAdmin={session.user.role === "admin"}
      />
      <section className="min-w-0">{children}</section>
    </div>
  );
}

function AdminFrameFallback() {
  return (
    <div className="admin-shell" aria-live="polite">
      <div className="h-11 animate-pulse rounded-lg bg-default-100" />
      <div className="mt-4 h-48 animate-pulse rounded-lg bg-default-100" />
    </div>
  );
}
