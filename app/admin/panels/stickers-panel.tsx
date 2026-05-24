import {
  listStickersPaginated,
  type StickerSort,
  type StickerStatus,
} from "@/lib/queries/admin-stickers";
import { listCachedCategories } from "@/lib/queries/categories";
import { listCachedAllCharactersWithCounts } from "@/lib/queries/characters";
import { StickersTable } from "./stickers-table";

const VALID_STATUS: readonly StickerStatus[] = ["approved", "pending", "rejected"];
const VALID_SORT: readonly StickerSort[] = [
  "grouped",
  "newest",
  "oldest",
  "name",
  "name-desc",
  "category",
  "category-desc",
  "status",
  "status-desc",
  "submitter",
  "submitter-desc",
];
const DEFAULT_PAGE_SIZE = 20;

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function StickersPanel({ searchParams }: Props) {
  const status = single(searchParams.status);
  const character = single(searchParams.character);
  const category = single(searchParams.category);
  const q = single(searchParams.q);
  const submitter = single(searchParams.submitter);
  const sort = single(searchParams.sort);
  const page = Math.max(1, Number.parseInt(single(searchParams.page) ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number.parseInt(single(searchParams.pageSize) ?? `${DEFAULT_PAGE_SIZE}`, 10) ||
      DEFAULT_PAGE_SIZE),
  );

  const [result, categories, characters] = await Promise.all([
    listStickersPaginated({
      status: (VALID_STATUS as readonly string[]).includes(status ?? "")
        ? (status as StickerStatus)
        : undefined,
      characterId: character,
      categoryId: category,
      q,
      submitter,
      sort: readSort(sort),
      page,
      pageSize,
    }),
    listCachedCategories(),
    listCachedAllCharactersWithCounts(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <StickersTable
        items={result.items}
        categories={categories}
        characters={characters}
        page={result.page}
        pageCount={result.pageCount}
        pageSize={result.pageSize}
        sort={readSort(sort)}
        total={result.total}
      />
    </div>
  );
}

function readSort(value: string | undefined): StickerSort {
  return (VALID_SORT as readonly string[]).includes(value ?? "")
    ? (value as StickerSort)
    : "grouped";
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (!value) return undefined;
  return value;
}
