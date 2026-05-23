"use client";

import Image from "next/image";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Chip, Input } from "@/components/ui/heroui-compat";
import { useFeedback } from "@/components/feedback";
import type { Category } from "@/lib/types";
import { CategorySelect } from "@/app/admin/category-select";
import { approveSubmission, rejectSubmission } from "./actions";

interface SimilarCandidate {
  id: string;
  name: string;
  previewSrc: string;
  status: "approved" | "pending";
  distance: number;
}

interface Submission {
  id: string;
  name: string;
  src: string;
  previewSrc: string;
  width: number;
  height: number;
  categoryId: string;
  tags: string[];
  submittedAt: Date;
  submitterName: string | null;
  submitterLogin: string | null;
  similarCandidates: readonly SimilarCandidate[];
}

interface Props {
  submissions: readonly Submission[];
  categories: readonly Category[];
}

export function SubmissionList({ submissions, categories }: Props) {
  if (submissions.length === 0) return <p className="text-default-500">暂无待审核投稿。</p>;
  return (
    <div className="flex flex-col gap-4">
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission} categories={categories} />
      ))}
    </div>
  );
}

function SubmissionCard({ submission, categories }: { submission: Submission; categories: readonly Category[] }) {
  const router = useRouter();
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const initial = initialSelection(submission.categoryId, categories);
  const [character, setCharacter] = useState(initial.character);
  const [subCategory, setSubCategory] = useState(initial.subCategory);
  const [name, setName] = useState(submission.name);
  const [tags, setTags] = useState(submission.tags.join(", "));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approve = () => runApproval({ name, subCategory, tags, submission, setError, startTransition, feedback, router });
  const reject = () => runRejection({ reason, submission, setError, startTransition, feedback, router });

  return (
    <article className={`motion-list-item admin-panel overflow-hidden p-4 ${error ? "motion-shake" : ""}`}>
      <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)]">
        <SubmissionPreview submission={submission} />
        <div className="flex min-w-0 flex-col gap-2">
          <SubmissionFields
            categories={categories}
            character={character}
            name={name}
            reason={reason}
            setCharacter={setCharacter}
            setName={setName}
            setReason={setReason}
            setSubCategory={setSubCategory}
            setTags={setTags}
            subCategory={subCategory}
            tags={tags}
          />
          <SimilarCandidates candidates={submission.similarCandidates} />
          <SubmissionActions pending={pending} onApprove={approve} onReject={reject} />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </article>
  );
}

function SubmissionPreview({ submission }: { submission: Submission }) {
  return (
    <div className="flex-shrink-0">
      <Image
        src={submission.previewSrc}
        alt={submission.name}
        width={submission.width}
        height={submission.height}
        className="max-h-56 w-full rounded-lg bg-default-50 object-contain"
        unoptimized
      />
      <p className="mt-2 text-xs text-default-500">{submission.width}×{submission.height}</p>
      <p className="mt-1 text-xs text-default-500">
        投稿者：{submission.submitterLogin ? `@${submission.submitterLogin}` : (submission.submitterName ?? "未知")}
      </p>
      <p className="text-xs text-default-500">
        时间：{new Date(submission.submittedAt).toLocaleString("zh-CN")}
      </p>
    </div>
  );
}

function SubmissionFields(props: SubmissionFieldsProps) {
  const topLevels = props.categories.filter((item) => !item.parentId);
  const subCategories = props.categories.filter((item) => item.parentId === props.character);
  return (
    <>
      <Field label="名字">
        <Input value={props.name} onChange={(event) => props.setName(event.target.value)} />
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="角色">
          <CategorySelect categories={topLevels} value={props.character} onChange={props.setCharacter} />
        </Field>
        <Field label="子分类">
          <CategorySelect categories={subCategories} value={props.subCategory} onChange={props.setSubCategory} />
        </Field>
      </div>
      <Field label="标签（逗号分隔）">
        <Input value={props.tags} onChange={(event) => props.setTags(event.target.value)} />
      </Field>
      <Field label="拒绝理由（可选，拒绝时使用）">
        <Input value={props.reason} onChange={(event) => props.setReason(event.target.value)} />
      </Field>
    </>
  );
}

function SimilarCandidates({ candidates }: { candidates: readonly SimilarCandidate[] }) {
  if (candidates.length === 0) return null;
  return (
    <section className="mt-1 rounded-lg border border-warning/30 bg-warning/5 p-3">
      <p className="text-xs font-medium text-warning">疑似相似</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {candidates.map((candidate) => (
          <SimilarCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </section>
  );
}

function SimilarCandidateCard({ candidate }: { candidate: SimilarCandidate }) {
  return (
    <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-2 rounded-md border border-default-200 bg-content1 p-2">
      <Image src={candidate.previewSrc} alt={candidate.name} width={56} height={56} className="h-14 w-14 object-contain" unoptimized />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{candidate.name}</p>
        <p className="truncate text-xs text-default-500">{candidate.id}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Chip size="sm" variant="soft"><Chip.Label>距离 {candidate.distance}</Chip.Label></Chip>
          <Chip size="sm" variant={candidate.status === "approved" ? "primary" : "secondary"}>
            <Chip.Label>{candidate.status === "approved" ? "已发布" : "待审核"}</Chip.Label>
          </Chip>
        </div>
      </div>
    </div>
  );
}

function SubmissionActions({ pending, onApprove, onReject }: SubmissionActionsProps) {
  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-default-100 pt-3 sm:flex-row">
      <Button size="sm" variant="primary" isPending={pending} onPress={onApprove} className="motion-press">
        批准
      </Button>
      <Button size="sm" variant="ghost" isPending={pending} onPress={onReject} className="motion-press">
        拒绝
      </Button>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-default-500">{label}</label>
      {children}
    </div>
  );
}

function runApproval(options: SubmissionMutationOptions & { name: string; subCategory: string; tags: string }) {
  options.setError(null);
  if (!options.subCategory) {
    options.setError("请选择子分类。");
    return;
  }
  options.startTransition(() => {
    void runSubmissionAction(options, approveSubmission, approvalFormData(options));
  });
}

function runRejection(options: SubmissionMutationOptions & { reason: string }) {
  options.setError(null);
  options.startTransition(() => {
    void runSubmissionAction(options, rejectSubmission, rejectionFormData(options));
  });
}

async function runSubmissionAction(
  options: SubmissionMutationOptions,
  action: (formData: FormData) => Promise<void>,
  formData: FormData,
) {
  try {
    await action(formData);
    options.feedback.success(`已处理：${options.submission.name}`);
    options.router.refresh();
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败。";
    options.setError(message);
    options.feedback.error(message);
  }
}

function approvalFormData(options: { submission: Submission; subCategory: string; name: string; tags: string }) {
  const formData = new FormData();
  formData.set("id", options.submission.id);
  formData.set("category", options.subCategory);
  formData.set("name", options.name);
  formData.set("tags", options.tags);
  return formData;
}

function rejectionFormData(options: { submission: Submission; reason: string }) {
  const formData = new FormData();
  formData.set("id", options.submission.id);
  formData.set("reason", options.reason);
  return formData;
}

function initialSelection(categoryId: string, categories: readonly Category[]) {
  const category = categories.find((item) => item.id === categoryId);
  return {
    character: category?.parentId ?? categoryId,
    subCategory: category?.parentId ? categoryId : "",
  };
}

interface SubmissionFieldsProps {
  categories: readonly Category[];
  character: string;
  name: string;
  reason: string;
  setCharacter: (value: string) => void;
  setName: (value: string) => void;
  setReason: (value: string) => void;
  setSubCategory: (value: string) => void;
  setTags: (value: string) => void;
  subCategory: string;
  tags: string;
}

interface SubmissionActionsProps {
  pending: boolean;
  onApprove: () => void;
  onReject: () => void;
}

interface SubmissionMutationOptions {
  feedback: ReturnType<typeof useFeedback>;
  router: ReturnType<typeof useRouter>;
  setError: (value: string | null) => void;
  startTransition: (callback: () => void) => void;
  submission: Submission;
}
