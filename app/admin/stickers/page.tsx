import { Suspense } from "react";
import { StickersPanel } from "../panels/stickers-panel";
import { AdminPanelLoading } from "../panel-loading";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function StickersPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AdminPanelLoading tab="stickers" />}>
      <StickersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StickersContent({ searchParams }: PageProps) {
  return <StickersPanel searchParams={await searchParams} />;
}
