import { listStickersPaginated, type StickerStatus } from "@/lib/queries/admin-stickers";
import { listAllCategories } from "@/lib/queries/categories";
import { StickersFilters } from "./stickers-filters";
import { StickersTable } from "./stickers-table";

const VALID_STATUS: readonly StickerStatus[] = ["approved", "pending", "rejected"];
const DEFAULT_PAGE_SIZE = 20;

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function StickersPanel({ searchParams }: Props) {
  const status = single(searchParams.status);
  const character = single(searchParams.character);
  const category = single(searchParams.category);
  const tag = single(searchParams.tag);
  const q = single(searchParams.q);
  const sort = single(searchParams.sort);
  const page = Math.max(1, Number.parseInt(single(searchParams.page) ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number.parseInt(single(searchParams.pageSize) ?? `${DEFAULT_PAGE_SIZE}`, 10) ||
      DEFAULT_PAGE_SIZE),
  );

  const [result, categories] = await Promise.all([
    listStickersPaginated({
      status: (VALID_STATUS as readonly string[]).includes(status ?? "")
        ? (status as StickerStatus)
        : undefined,
      characterId: character,
      categoryId: category,
      tag,
      q,
      sort: sort === "newest" || sort === "oldest" || sort === "name" ? sort : "grouped",
      page,
      pageSize,
    }),
    listAllCategories(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <StickersFilters
        categories={categories}
        current={{ status, character, category, tag, q, sort, pageSize }}
      />
      <StickersTable
        items={result.items}
        categories={categories}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (!value) return undefined;
  return value;
}
