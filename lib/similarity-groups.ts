import {
  VISUAL_SIMILAR_SCORE_V2,
  isSimilarFingerprint,
  visualFingerprintDistance,
  type VisualFingerprintDistance,
} from "./visual-hash";

export type ActiveStickerStatus = "approved" | "pending";

export interface SimilaritySource {
  id: string;
  characterId: string;
  visualHashV2: string;
}

export interface SimilarityRow extends SimilaritySource {
  name: string;
  src: string;
  previewSrc: string;
  width: number;
  height: number;
  categoryId: string;
  tags: string[];
  status: ActiveStickerStatus;
  submitterLogin: string | null;
  submittedAt: Date;
}

export interface SimilarSticker {
  id: string;
  name: string;
  previewSrc: string;
  status: ActiveStickerStatus;
  distance: number;
  perceptualDistance: number;
}

export interface DuplicateSticker extends SimilarityRow {
  nearestDistance: number;
}

export interface DuplicateGroup {
  id: string;
  minDistance: number;
  stickers: DuplicateSticker[];
}

export interface SimilarityOptions {
  ignoredPairs?: ReadonlySet<string>;
}

export function findSimilarRows(
  source: SimilaritySource,
  rows: readonly SimilarityRow[],
  options: SimilarityOptions = {},
): SimilarSticker[] {
  const matches = rows.flatMap((row) => {
    if (row.id === source.id) return [];
    if (row.characterId !== source.characterId) return [];
    if (isIgnoredPair(source.id, row.id, options.ignoredPairs)) return [];
    const distance = visualFingerprintDistance(source.visualHashV2, row.visualHashV2);
    return isSimilarFingerprint(distance) ? [toSimilarSticker(row, distance)] : [];
  });
  return matches.sort(compareSimilarStickers);
}

export function buildDuplicateGroups(
  rows: readonly SimilarityRow[],
  options: SimilarityOptions = {},
): DuplicateGroup[] {
  const sets = new DisjointSets(rows.map((row) => row.id));
  const nearest = new Map<string, number>();
  for (const group of rowsByCharacter(rows).values()) {
    compareCharacterRows(group, sets, nearest, options.ignoredPairs);
  }
  return collectDuplicateGroups(rows, sets, nearest);
}

export function similarityPairKey(leftId: string, rightId: string): string {
  const [left, right] = normalizePair(leftId, rightId);
  return `${left}\0${right}`;
}

export function normalizePair(leftId: string, rightId: string): readonly [string, string] {
  if (leftId === rightId) throw new Error("相似关系不能指向同一张贴纸。");
  return leftId < rightId ? [leftId, rightId] : [rightId, leftId];
}

function compareCharacterRows(
  rows: readonly SimilarityRow[],
  sets: DisjointSets,
  nearest: Map<string, number>,
  ignoredPairs: ReadonlySet<string> | undefined,
) {
  for (let left = 0; left < rows.length; left += 1) {
    compareRowPairs(rows, left, sets, nearest, ignoredPairs);
  }
}

function compareRowPairs(
  rows: readonly SimilarityRow[],
  left: number,
  sets: DisjointSets,
  nearest: Map<string, number>,
  ignoredPairs: ReadonlySet<string> | undefined,
) {
  for (let right = left + 1; right < rows.length; right += 1) {
    if (isIgnoredPair(rows[left].id, rows[right].id, ignoredPairs)) continue;
    const distance = visualFingerprintDistance(rows[left].visualHashV2, rows[right].visualHashV2);
    if (!isSimilarFingerprint(distance)) continue;
    sets.union(rows[left].id, rows[right].id);
    rememberNearest(nearest, rows[left].id, distance.score);
    rememberNearest(nearest, rows[right].id, distance.score);
  }
}

function rowsByCharacter(rows: readonly SimilarityRow[]): Map<string, SimilarityRow[]> {
  const grouped = new Map<string, SimilarityRow[]>();
  for (const row of rows) {
    grouped.set(row.characterId, [...(grouped.get(row.characterId) ?? []), row]);
  }
  return grouped;
}

function isIgnoredPair(
  leftId: string,
  rightId: string,
  ignoredPairs: ReadonlySet<string> | undefined,
): boolean {
  return ignoredPairs?.has(similarityPairKey(leftId, rightId)) ?? false;
}

function collectDuplicateGroups(
  rows: readonly SimilarityRow[],
  sets: DisjointSets,
  nearest: ReadonlyMap<string, number>,
): DuplicateGroup[] {
  const grouped = new Map<string, SimilarityRow[]>();
  for (const row of rows) {
    const root = sets.find(row.id);
    grouped.set(root, [...(grouped.get(root) ?? []), row]);
  }
  return [...grouped.values()]
    .filter((group) => group.length > 1)
    .map((group) => toDuplicateGroup(group, nearest))
    .sort(compareDuplicateGroups);
}

function toDuplicateGroup(
  rows: readonly SimilarityRow[],
  nearest: ReadonlyMap<string, number>,
): DuplicateGroup {
  const stickers = rows.map((row) => ({
    ...row,
    nearestDistance: nearest.get(row.id) ?? VISUAL_SIMILAR_SCORE_V2,
  }));
  const sorted = stickers.sort(compareDuplicateStickers);
  return {
    id: `duplicate:${sorted.map((row) => row.id).join("+")}`,
    minDistance: Math.min(...sorted.map((row) => row.nearestDistance)),
    stickers: sorted,
  };
}

function toSimilarSticker(row: SimilarityRow, distance: VisualFingerprintDistance): SimilarSticker {
  return {
    id: row.id,
    name: row.name,
    previewSrc: row.previewSrc,
    status: row.status,
    distance: distance.score,
    perceptualDistance: distance.perceptual,
  };
}

function rememberNearest(map: Map<string, number>, id: string, distance: number) {
  const current = map.get(id);
  if (current === undefined || distance < current) map.set(id, distance);
}

function compareSimilarStickers(left: SimilarSticker, right: SimilarSticker) {
  return (
    left.distance - right.distance ||
    left.perceptualDistance - right.perceptualDistance ||
    left.name.localeCompare(right.name, "zh-CN") ||
    left.id.localeCompare(right.id)
  );
}

function compareDuplicateGroups(left: DuplicateGroup, right: DuplicateGroup) {
  return left.minDistance - right.minDistance || left.id.localeCompare(right.id);
}

function compareDuplicateStickers(left: DuplicateSticker, right: DuplicateSticker) {
  return (
    left.nearestDistance - right.nearestDistance ||
    statusRank(left.status) - statusRank(right.status) ||
    left.name.localeCompare(right.name, "zh-CN") ||
    left.id.localeCompare(right.id)
  );
}

function statusRank(status: ActiveStickerStatus): number {
  return status === "approved" ? 0 : 1;
}

class DisjointSets {
  private readonly parent = new Map<string, string>();

  constructor(ids: readonly string[]) {
    ids.forEach((id) => this.parent.set(id, id));
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent) throw new Error(`未知贴纸 id：${id}`);
    if (parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(left: string, right: string): void {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
  }
}
