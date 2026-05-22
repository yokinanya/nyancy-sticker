"use client";

import { useState, useTransition } from "react";
import { Button, Input, Modal } from "@heroui/react";
import { useFeedback } from "@/components/feedback";
import type { Category } from "@/lib/types";
import { createSubcategoryForSubmit } from "./actions";

interface Props {
  parentId: string;
  parentName: string;
  onClose: () => void;
  onCreated: (cat: Category) => void;
}

export function CreateSubcategoryModal({ parentId, parentName, onClose, onCreated }: Props) {
  const feedback = useFeedback();
  const [pending, startTransition] = useTransition();
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("parentId", parentId);
    fd.set("categoryId", id);
    fd.set("categoryName", name);
    startTransition(async () => {
      try {
        const result = await createSubcategoryForSubmit(fd);
        feedback.success(`已创建分类：${result.name}`);
        onCreated({ id: result.id, name: result.name, parentId });
      } catch (e) {
        const message = e instanceof Error ? e.message : "创建失败。";
        setError(message);
        feedback.error(message);
      }
    });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
        <Modal.Container>
          <Modal.Dialog className={`motion-panel modal-surface w-full max-w-md ${error ? "motion-shake" : ""}`}>
            <Modal.CloseTrigger className="motion-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-default-500 hover:bg-default-100 hover:text-default-800">
              <span aria-hidden="true">
                ×
              </span>
            </Modal.CloseTrigger>
            <Modal.Header>
              <Modal.Heading>在「{parentName}」下新建子分类</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-default-500">分类 ID（slug）</label>
                  <Input
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder="例如：2026 或 daily"
                    className="field-control bg-content1 px-3"
                  />
                  <span className="text-[10px] text-default-400">
                    字母数字下划线短横线，长度 2-32。最终 ID 会拼成「{parentId}_{id || "..."}」。
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-default-500">分类显示名</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：2026 或 日常"
                    className="field-control bg-content1 px-3"
                  />
                </div>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <div className="flex w-full flex-col justify-end gap-2 sm:flex-row">
                <Button variant="ghost" onPress={onClose} className="motion-press">
                  取消
                </Button>
                <Button variant="primary" isPending={pending} onPress={submit} className="motion-press">
                  创建
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
