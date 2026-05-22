import Link from "next/link";
import { listCharactersWithCounts } from "@/lib/queries/characters";

export const revalidate = false;

export default async function HomePage() {
  const characters = await listCharactersWithCounts();
  return (
    <div className="motion-page mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      <h1 className="mb-2 text-2xl font-semibold">选择角色</h1>
      <p className="mb-6 text-sm text-default-500">
        共 {characters.length} 位角色。点击进入对应表情画廊。
      </p>
      <ul className="motion-panel flex flex-col divide-y divide-default-200 rounded-lg border border-default-200 bg-content1 shadow-sm">
        {characters.map((c) => (
          <li key={c.id} className="motion-list-item">
            <Link
              href={`/${encodeURIComponent(c.id)}`}
              className="motion-interactive flex items-center justify-between px-4 py-3 hover:bg-default-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="text-base font-medium">{c.name}</span>
              <span className="text-sm text-default-500">{c.count} 张</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
