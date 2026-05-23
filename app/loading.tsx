const SKELETON_ITEMS = 6;

export default function HomeLoading() {
  return (
    <div className="motion-page page-shell flex max-w-6xl flex-col">
      <div className="mb-2 h-8 w-32 animate-pulse rounded-md skeleton" />
      <div className="mb-6 h-4 w-48 animate-pulse rounded-md skeleton" />
      <ul className="surface flex flex-col divide-y divide-default-200">
        {Array.from({ length: SKELETON_ITEMS }, (_, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-3">
            <span className="h-5 w-24 animate-pulse rounded skeleton" />
            <span className="h-4 w-12 animate-pulse rounded skeleton" />
          </li>
        ))}
      </ul>
    </div>
  );
}
