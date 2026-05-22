"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@heroui/react";
import { useFeedback } from "@/components/feedback";
import type { Category } from "@/lib/types";
import { CategorySelect } from "@/app/admin/category-select";
import { approveSubmission, rejectSubmission } from "./actions";

interface Submission {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  categoryId: string;
  tags: string[];
  submittedAt: Date;
  submitterName: string | null;
  submitterLogin: string | null;
}

interface Props {
  submissions: readonly Submission[];
  categories: readonly Category[];
}

export function SubmissionList({ submissions, categories }: Props) {
  if (submissions.length === 0) {
    return <p className="text-default-500">暂无待审核投稿。</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {submissions.map((s) => (
        <SubmissionCard key={s.id} submission={s} categories={categories} />
      ))}
    </div>
  );
}

function SubmissionCard({
  submission,
  categories,
}: {
  submission: Submission;
  categories: readonly Category[];
}) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(submission.categoryId);
  const [name, setName] = useState(submission.name);
  const [tags, setTags] = useState(submission.tags.join(", "));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onApprove = () => {
    setError(null);
    const fd = new FormData();
    fd.set("id", submission.id);
    fd.set("category", category);
    fd.set("name", name);
    fd.set("tags", tags);
    startTransition(async () => {
      try {
        await approveSubmission(fd);
        feedback.success(`已批准：${name}`);
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "批准失败。";
        setError(message);
        feedback.error(message);
      }
    });
  };

  const onReject = () => {
    setError(null);
    const fd = new FormData();
    fd.set("id", submission.id);
    fd.set("reason", reason);
    startTransition(async () => {
      try {
        await rejectSubmission(fd);
        feedback.info(`已拒绝：${submission.name}`);
        router.refresh();
      } catch (e) {
        const message = e instanceof Error ? e.message : "拒绝失败。";
        setError(message);
        feedback.error(message);
      }
    });
  };

  return (
    <article className={`motion-list-item admin-panel overflow-hidden p-4 ${error ? "motion-shake" : ""}`}>
      <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="flex-shrink-0">
        <Image
          src={submission.src}
          alt={submission.name}
          width={submission.width}
          height={submission.height}
          className="max-h-56 w-full rounded-lg bg-default-50 object-contain"
          unoptimized
        />
        <p className="mt-2 text-xs text-default-500">
          {submission.width}×{submission.height}
        </p>
        <p className="mt-1 text-xs text-default-500">
          投稿者：
          {submission.submitterLogin ? `@${submission.submitterLogin}` : (submission.submitterName ?? "未知")}
        </p>
        <p className="text-xs text-default-500">
          时间：{new Date(submission.submittedAt).toLocaleString("zh-CN")}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-default-500">名字</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="field-control" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-default-500">分类</label>
          <CategorySelect categories={categories} value={category} onChange={setCategory} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-default-500">标签（逗号分隔）</label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} className="field-control" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-default-500">拒绝理由（可选，拒绝时使用）</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} className="field-control" />
        </div>
        <div className="mt-2 flex flex-col gap-2 border-t border-default-100 pt-3 sm:flex-row">
          <Button size="sm" variant="primary" isPending={pending} onPress={onApprove} className="motion-press">
            批准
          </Button>
          <Button size="sm" variant="ghost" isPending={pending} onPress={onReject} className="motion-press">
            拒绝
          </Button>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
      </div>
    </article>
  );
}
