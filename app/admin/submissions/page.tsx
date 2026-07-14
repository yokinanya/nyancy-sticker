import { Suspense } from "react";
import { SubmissionsPanel } from "../panels/submissions-panel";
import { AdminPanelLoading } from "../panel-loading";

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<AdminPanelLoading tab="submissions" />}>
      <SubmissionsPanel />
    </Suspense>
  );
}
