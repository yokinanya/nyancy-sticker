import { ManifestEditor } from "./manifest-editor";
import { readManifestFile } from "@/lib/manifest-file";

export const metadata = {
  title: "本地管理 - 猫猫冲表情站",
};

export default async function AdminPage() {
  if (process.env.NODE_ENV !== "development") return <UnavailablePage />;
  const manifest = await readManifestFile();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <ManifestEditor manifest={manifest} />
    </div>
  );
}

function UnavailablePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        本地管理页只允许在 development 环境使用。
      </div>
    </div>
  );
}
