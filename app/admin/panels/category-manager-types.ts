export type SubmitAction = (fd: FormData) => Promise<void>;
export type SubmitHandler = (action: SubmitAction, fd: FormData, done: string) => void;

import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";

export type CategoryDraft =
  | { mode: "add-character"; character: null; category: null }
  | { mode: "edit-character"; character: CharacterWithCount; category: null }
  | { mode: "add-category"; character: CharacterWithCount; category: null }
  | { mode: "edit-category"; character: null; category: CategoryWithCount };
