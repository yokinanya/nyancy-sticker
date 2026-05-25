export function categoryIdFor(characterId: string, slug: string): string {
  return `${characterId}_${slug}`;
}
