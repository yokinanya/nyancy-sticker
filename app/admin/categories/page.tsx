import { Suspense } from "react";
import { requireEditor } from "@/lib/auth-helpers";
import { CategoriesPanel } from "../panels/categories-panel";
import { AdminPanelLoading } from "../panel-loading";

export default function CategoriesPage() {
  return (
    <Suspense fallback={<AdminPanelLoading tab="categories" />}>
      <CategoriesContent />
    </Suspense>
  );
}

async function CategoriesContent() {
  const session = await requireEditor();
  return <CategoriesPanel isAdmin={session.user.role === "admin"} />;
}
