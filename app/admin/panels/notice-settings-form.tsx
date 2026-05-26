"use client";

import { RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { updateWarningBannerNotice } from "@/app/admin/notice-actions";
import { useFeedback } from "@/components/feedback";
import { Button, Input } from "@/components/ui/heroui-compat";
import { DEFAULT_WARNING_BANNER_MESSAGE } from "@/lib/site-notice-constants";
import type { EditableSiteNotice } from "@/lib/queries/site-notice";

interface NoticeDraft {
  readonly enabled: boolean;
  readonly message: string;
  readonly linkLabel: string;
  readonly linkUrl: string;
}

export function NoticeSettingsForm({ notice }: { notice: EditableSiteNotice | null }) {
  const [draft, setDraft] = useState<NoticeDraft>(() => initialDraft(notice));
  const [pending, startTransition] = useTransition();
  const feedback = useFeedback();
  const router = useRouter();

  const save = () => {
    startTransition(async () => {
      try {
        await updateWarningBannerNotice(toFormData(draft));
        feedback.success("公告设置已保存。");
        router.refresh();
      } catch (error) {
        feedback.error(error instanceof Error ? error.message : "公告设置保存失败。");
      }
    });
  };

  return (
    <section className="admin-panel p-4">
      <div className="flex flex-col gap-4">
        <Header updatedAt={notice?.updatedAt ?? null} />
        <EnabledSwitch
          enabled={draft.enabled}
          onChange={(enabled) => setDraft({ ...draft, enabled })}
        />
        <NoticeFields draft={draft} onChange={setDraft} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="soft"
            onPress={() => setDraft(defaultDraft())}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            恢复默认值
          </Button>
          <Button type="button" variant="primary" isPending={pending} onPress={save}>
            <Save className="h-4 w-4" aria-hidden="true" />
            保存公告
          </Button>
        </div>
      </div>
    </section>
  );
}

function Header({ updatedAt }: { updatedAt: Date | null }) {
  return (
    <div>
      <h2 className="admin-section-title">滚动告警提示条</h2>
      <p className="admin-section-description mt-1">
        保存后会影响全站悬浮更新提醒。
        {updatedAt ? ` 上次更新：${formatDate(updatedAt)}` : ""}
      </p>
    </div>
  );
}

function EnabledSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface/40 p-3">
      <input
        type="checkbox"
        className="h-4 w-4 accent-warning"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-sm font-medium text-foreground">启用全站告警提示条</span>
    </label>
  );
}

function NoticeFields({
  draft,
  onChange,
}: {
  draft: NoticeDraft;
  onChange: (draft: NoticeDraft) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="公告文案">
        <textarea
          value={draft.message}
          onChange={(event) => onChange({ ...draft, message: event.target.value })}
          className="field-control min-h-28 resize-y px-3 py-2"
          placeholder={DEFAULT_WARNING_BANNER_MESSAGE}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="链接文字">
          <Input
            value={draft.linkLabel}
            onChange={(event) => onChange({ ...draft, linkLabel: event.target.value })}
            className="px-3"
            placeholder="查看详情"
          />
        </Field>
        <Field label="链接地址">
          <Input
            value={draft.linkUrl}
            onChange={(event) => onChange({ ...draft, linkUrl: event.target.value })}
            className="px-3"
            placeholder="/status 或 https://..."
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-default-600">{label}</span>
      {children}
    </label>
  );
}

function initialDraft(notice: EditableSiteNotice | null): NoticeDraft {
  return {
    enabled: notice?.enabled ?? false,
    message: notice?.message ?? DEFAULT_WARNING_BANNER_MESSAGE,
    linkLabel: notice?.linkLabel ?? "",
    linkUrl: notice?.linkUrl ?? "",
  };
}

function defaultDraft(): NoticeDraft {
  return {
    enabled: false,
    message: DEFAULT_WARNING_BANNER_MESSAGE,
    linkLabel: "",
    linkUrl: "",
  };
}

function toFormData(draft: NoticeDraft): FormData {
  const formData = new FormData();
  if (draft.enabled) formData.set("enabled", "on");
  formData.set("message", draft.message);
  formData.set("linkLabel", draft.linkLabel);
  formData.set("linkUrl", draft.linkUrl);
  return formData;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
