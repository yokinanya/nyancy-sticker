import { cacheLife, cacheTag } from "next/cache";
import { eq } from "drizzle-orm";
import { siteNotices } from "@/drizzle/schema";
import { db } from "@/lib/db";
import { SITE_NOTICE_CACHE_TAG, WARNING_BANNER_NOTICE_ID } from "@/lib/site-notice-constants";
export {
  DEFAULT_WARNING_BANNER_MESSAGE,
  SITE_NOTICE_CACHE_TAG,
  WARNING_BANNER_NOTICE_ID,
} from "@/lib/site-notice-constants";

export interface EditableSiteNotice {
  id: string;
  enabled: boolean;
  message: string;
  linkLabel: string | null;
  linkUrl: string | null;
  updatedAt: Date;
}

export interface VisibleSiteNotice {
  message: string;
  linkLabel: string | null;
  linkUrl: string | null;
}

export async function getWarningBannerNotice(): Promise<EditableSiteNotice | null> {
  const row = await db.query.siteNotices.findFirst({
    where: eq(siteNotices.id, WARNING_BANNER_NOTICE_ID),
  });
  return row ?? null;
}

async function getVisibleWarningBannerNotice(): Promise<VisibleSiteNotice | null> {
  const notice = await getWarningBannerNotice();
  if (!notice?.enabled) return null;

  const message = notice.message.trim();
  if (!message) return null;

  return {
    message,
    linkLabel: notice.linkLabel?.trim() || null,
    linkUrl: notice.linkUrl?.trim() || null,
  };
}

export async function getCachedVisibleWarningBannerNotice() {
  "use cache";
  cacheLife("max");
  cacheTag(SITE_NOTICE_CACHE_TAG);
  return getVisibleWarningBannerNotice();
}
