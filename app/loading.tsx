const SKELETON_ITEMS = 6;

export default function HomeLoading() {
  return (
    <div className="motion-page mx-auto flex w-full max-w-2xl flex-col px-4 py-6">
      <div className="mb-2 h-8 w-32 rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="mb-6 h-4 w-48 rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <ul className="flex flex-col divide-y divide-default-200 rounded-lg border border-default-200 bg-content1 shadow-sm">
        {Array.from({ length: SKELETON_ITEMS }, (_, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3">
            <span className="h-5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <span className="h-4 w-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}
