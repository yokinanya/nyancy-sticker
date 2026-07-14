import { Suspense } from "react";
import { NoticePanel } from "../panels/notice-panel";
import { AdminPanelLoading } from "../panel-loading";

export default function NoticePage() {
  return (
    <Suspense fallback={<AdminPanelLoading tab="notice" />}>
      <NoticePanel />
    </Suspense>
  );
}
