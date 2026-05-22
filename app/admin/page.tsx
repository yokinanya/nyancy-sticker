import { requireEditor } from "@/lib/auth-helpers";
import { countByStatus } from "@/lib/queries/admin-stickers";
import { AdminTabs, type AdminTab } from "./admin-tabs";
import { SubmissionsPanel } from "./panels/submissions-panel";
import { StickersPanel } from "./panels/stickers-panel";
import { CategoriesPanel } from "./panels/categories-panel";
import { TagsPanel } from "./panels/tags-panel";
import { UploadFormPanel } from "./panels/upload-form-panel";
import { UsersPanel } from "./panels/users-panel";

export const metadata = {
  title: "后台管理 - 猫猫冲表情站",
};

const BASE_TABS: readonly AdminTab[] = [
  "submissions",
  "stickers",
  "categories",
  "tags",
  "upload",
];

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const session = await requireEditor();
  const isAdmin = session.user.role === "admin";

  const sp = await searchParams;
  const rawTab = single(sp.tab);
  const validTabs: readonly AdminTab[] = isAdmin ? [...BASE_TABS, "users"] : BASE_TABS;
  const tab: AdminTab = (validTabs as readonly string[]).includes(rawTab ?? "")
    ? (rawTab as AdminTab)
    : "submissions";

  const counts = await countByStatus();

  return (
    <div className="motion-page admin-shell">
      <div className="min-w-0">
        <AdminTabs tab={tab} pendingCount={counts.pending} isAdmin={isAdmin} />
      </div>

      <section className="min-w-0">
        {tab === "submissions" && <SubmissionsPanel />}
        {tab === "stickers" && <StickersPanel searchParams={sp} />}
        {tab === "categories" && <CategoriesPanel />}
        {tab === "tags" && <TagsPanel />}
        {tab === "upload" && <UploadFormPanel />}
        {tab === "users" && isAdmin && <UsersPanel searchParams={sp} />}
      </section>
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
