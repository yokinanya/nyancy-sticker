import { Suspense } from "react";
import { UploadFormPanel } from "../panels/upload-form-panel";
import { AdminPanelLoading } from "../panel-loading";

export default function UploadPage() {
  return (
    <Suspense fallback={<AdminPanelLoading tab="upload" />}>
      <UploadFormPanel />
    </Suspense>
  );
}
