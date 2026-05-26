import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getCachedVisibleWarningBannerNotice } from "@/lib/queries/site-notice";

export async function SiteWarningBanner() {
  const notice = await getCachedVisibleWarningBannerNotice();
  if (!notice) return null;

  return (
    <aside className="site-warning-banner" role="status">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2">
        <TriangleAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <div className="site-warning-marquee min-w-0 flex-1">
          <span className="site-warning-marquee-content">{notice.message}</span>
        </div>
        {notice.linkUrl ? (
          <Link
            href={notice.linkUrl}
            className="ui-focus flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-warning hover:bg-warning/10"
          >
            {notice.linkLabel ?? "查看详情"}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
