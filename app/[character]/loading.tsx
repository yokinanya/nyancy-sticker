const SKELETON_ITEMS = 18;

export default function CharacterLoading() {
  return (
    <div className="page-shell flex max-w-7xl flex-col gap-4">
      <div className="h-10 animate-pulse rounded-md skeleton" />
      <div className="flex gap-2 overflow-hidden">
        <div className="h-8 w-24 shrink-0 animate-pulse rounded-md skeleton" />
        <div className="h-8 w-28 shrink-0 animate-pulse rounded-md skeleton" />
        <div className="h-8 w-20 shrink-0 animate-pulse rounded-md skeleton" />
      </div>
      <div className="h-8 animate-pulse rounded-md skeleton" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse rounded-lg skeleton"
          />
        ))}
      </div>
    </div>
  );
}
