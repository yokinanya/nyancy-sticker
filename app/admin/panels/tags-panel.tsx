import { listTagsWithCounts } from "@/lib/queries/tags";
import { TagManager } from "./tag-manager";

export async function TagsPanel() {
  const tags = await listTagsWithCounts();
  return <TagManager tags={tags} />;
}
