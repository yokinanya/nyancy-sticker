"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback";
import type { CategoryWithCount, CharacterWithCount } from "@/lib/queries/categories";
import { CategoryDetail } from "./category-detail";
import { CategoryEditorModal } from "./category-editor-modal";
import type { CategoryDraft, SubmitHandler } from "./category-manager-types";
import { RoleList } from "./category-role-list";

interface Props {
  readonly categories: readonly CategoryWithCount[];
  readonly characters: readonly CharacterWithCount[];
  readonly canAddRole: boolean;
}

export function CategoryManager(props: Props) {
  const state = useCategoryManager(props);
  return (
    <div className="flex flex-col gap-4">
      <ManagerPanels {...props} state={state} />
      <ManagerEditor {...props} state={state} />
    </div>
  );
}

function useCategoryManager({ categories, characters }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [query, setQuery] = useState("");
  const visibleRoles = useMemo(
    () => filterRoles(categories, characters, query),
    [categories, characters, query],
  );
  const selected = characters.find((item) => item.id === selectedId)
    ?? visibleRoles[0]
    ?? characters[0]
    ?? null;
  const submit: SubmitHandler = (action, fd, done) => {
    startTransition(async () => {
      try {
        await action(fd);
        setDraft(null);
        feedback.success(done);
        router.refresh();
      } catch (error) {
        feedback.error(error instanceof Error ? error.message : "操作失败。");
      }
    });
  };
  return { draft, pending, query, selected, setDraft, setQuery, setSelectedId, submit, visibleRoles };
}

type ManagerState = ReturnType<typeof useCategoryManager>;

function ManagerPanels({ canAddRole, categories, characters, state }: Props & { readonly state: ManagerState }) {
  const subcategories = state.selected
    ? categories.filter((item) => item.characterId === state.selected?.id)
    : [];
  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <RoleList roles={state.visibleRoles} categories={categories} query={state.query}
        selectedId={state.selected?.id ?? null} canAddRole={canAddRole}
        onAddRole={() => state.setDraft({ mode: "add-character", character: null, category: null })}
        onQueryChange={state.setQuery} onSelect={state.setSelectedId} totalRoles={characters.length} />
      <CategoryDetail selected={state.selected} subcategories={subcategories} pending={state.pending}
        onAddSubcategory={() => state.selected && state.setDraft({ mode: "add-category", character: state.selected, category: null })}
        onEditCategory={(category) => state.setDraft({ mode: "edit-category", character: null, category })}
        onEditCharacter={(character) => state.setDraft({ mode: "edit-character", character, category: null })}
        onSubmit={state.submit} />
    </div>
  );
}

function ManagerEditor({ categories, characters, state }: Props & { readonly state: ManagerState }) {
  if (!state.draft) return null;
  return (
    <CategoryEditorModal categories={categories} characters={characters} draft={state.draft}
      pending={state.pending} onClose={() => state.setDraft(null)} onCreated={state.setSelectedId}
      onSubmit={state.submit} />
  );
}

function filterRoles(categories: readonly CategoryWithCount[], roles: readonly CharacterWithCount[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return roles;
  const matchedRoleIds = new Set<string>();
  categories.forEach((category) => {
    if (matchesCategory(category, text)) matchedRoleIds.add(category.characterId);
  });
  roles.forEach((role) => {
    if (matchesRole(role, text)) matchedRoleIds.add(role.id);
  });
  return roles.filter((role) => matchedRoleIds.has(role.id));
}

function matchesRole(role: CharacterWithCount, text: string) {
  return role.name.toLowerCase().includes(text) || role.id.toLowerCase().includes(text);
}

function matchesCategory(category: CategoryWithCount, text: string) {
  return category.name.toLowerCase().includes(text)
    || category.slug.toLowerCase().includes(text)
    || category.id.toLowerCase().includes(text);
}
