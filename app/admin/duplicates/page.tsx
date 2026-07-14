import { Suspense } from "react";
import { DuplicatesPanel } from "../panels/duplicates-panel";
import { AdminPanelLoading } from "../panel-loading";

export default function DuplicatesPage() {
  return (
    <Suspense fallback={<AdminPanelLoading tab="duplicates" />}>
      <DuplicatesPanel />
    </Suspense>
  );
}
