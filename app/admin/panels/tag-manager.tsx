"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { deleteTag, renameTag } from "@/app/admin/actions";
import type { TagSummary } from "@/lib/queries/tags";

interface Props {
  tags: readonly TagSummary[];
}

export function TagManager({ tags }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = (action: (fd: FormData) => Promise<void>, fd: FormData, done: string) => {
    startTransition(async () => {
      try {
        await action(fd);
        setMessage(done);
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "操作失败。");
      }
    });
  };

  if (tags.length === 0) {
    return <p className="rounded-lg border border-default-200 bg-content1 p-6 text-center text-sm text-default-500">当前还没有任何标签。</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-default-200 bg-content1">
        <div className="border-b border-default-200 p-3 text-sm font-medium">
          标签列表（{tags.length} 个）
        </div>
        <ul className="divide-y divide-default-100">
          {tags.map((t) => (
            <TagRow key={t.tag} item={t} pending={pending} onRun={run} />
          ))}
        </ul>
      </div>
      {message ? <p className="text-xs text-default-500">{message}</p> : null}
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
    <li className="grid gap-2 p-3 md:grid-cols-[minmax(10rem,16rem)_1fr_auto_auto] md:items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm">#{item.tag}</span>
        <Chip size="sm" variant="soft"><Chip.Label>{item.count}</Chip.Label></Chip>
      </div>
      <Input value={to} onChange={(e) => setTo(e.target.value)} />
      <Button size="sm" variant="ghost" isPending={pending} onPress={onRename}>重命名</Button>
      <Button size="sm" variant="ghost" isPending={pending} onPress={onDelete}>删除</Button>
    </li>
  );
}
