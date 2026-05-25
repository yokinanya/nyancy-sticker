const RANDOM_SLUG_RADIX = 36;
const RANDOM_SLUG_PAD_LENGTH = 7;
const RANDOM_SLUG_MAX = RANDOM_SLUG_RADIX ** RANDOM_SLUG_PAD_LENGTH;

export function categoryIdFor(characterId: string, slug: string): string {
  return `${characterId}_${slug}`;
}

export function randomCategorySlug(): string {
  const value = randomSlugValue();
  return value.toString(RANDOM_SLUG_RADIX).padStart(RANDOM_SLUG_PAD_LENGTH, "0");
}

function randomSlugValue(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] % RANDOM_SLUG_MAX;
}
