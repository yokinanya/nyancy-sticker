"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { deleteTag, renameTag } from "@/app/admin/actions";
import { useFeedback } from "@/components/feedback";
import type { TagSummary } from "@/lib/queries/tags";

interface Props {
  tags: readonly TagSummary[];
}

export function TagManager({ tags }: Props) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();

  const run = (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => {
    startTransition(async () => {
      try {
        await action(fd);
        feedback.success(done);
        router.refresh();
      } catch (e) {
        feedback.error(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  if (tags.length === 0) {
    return <p className="admin-panel p-6 text-center text-sm text-default-500">当前还没有任何标签。</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="admin-panel overflow-hidden">
        <div className="border-b border-default-200 p-3">
          <h2 className="admin-section-title">标签列表</h2>
          <p className="admin-section-description mt-1">共 {tags.length} 个标签，可重命名或删除。</p>
        </div>
        <ul className="divide-y divide-default-100">
          {tags.map((t) => (
            <TagRow key={t.tag} item={t} pending={pending} onRun={run} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function TagRow({ item, pending, onRun }: { item: TagSummary; pending: boolean; onRun: (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => void; }) {
  const [to, setTo] = useState(item.tag);
  const onRename = () => {
    if (to === item.tag) return;
    const fd = new FormData();
    fd.set("tagFrom", item.tag);
    fd.set("tagTo", to);
    onRun(renameTag, fd, `已重命名：${item.tag} → ${to}`);
  };
  const onDelete = () => {
    if (!window.confirm(`确认删除标签 #${item.tag}？`)) return;
    const fd = new FormData();
    fd.set("tag", item.tag);
    onRun(deleteTag, fd, `已删除：${item.tag}`);
  };
  return (
    <li className="motion-list-item grid gap-2 p-3 md:grid-cols-[minmax(10rem,16rem)_1fr_auto_auto] md:items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm">#{item.tag}</span>
        <Chip size="sm" variant="soft"><Chip.Label>{item.count}</Chip.Label></Chip>
      </div>
      <Input value={to} onChange={(e) => setTo(e.target.value)} className="field-control" />
      <Button size="sm" variant="ghost" isPending={pending} onPress={onRename} className="motion-press">重命名</Button>
      <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete} className="motion-press">删除</Button>
    </li>
  );
}
