const SKELETON_ITEMS = 18;

export default function CharacterLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <div className="h-10 rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="flex gap-2 overflow-hidden">
        <div className="h-8 w-24 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-8 w-28 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-8 w-20 shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="h-8 rounded-md bg-zinc-100 dark:bg-zinc-800" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    </div>
  );
}
