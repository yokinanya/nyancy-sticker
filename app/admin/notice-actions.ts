"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { siteNotices } from "@/drizzle/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  SITE_NOTICE_CACHE_TAG,
  WARNING_BANNER_NOTICE_ID,
} from "@/lib/site-notice-constants";

export async function updateWarningBannerNotice(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const enabled = readBoolean(formData, "enabled");
  const message = readOptionalText(formData, "message") ?? "";
  const linkLabel = readOptionalText(formData, "linkLabel");
  const linkUrl = readOptionalText(formData, "linkUrl");
  const updatedAt = new Date();
  assertAllowedNoticeUrl(linkUrl);

  await db
    .insert(siteNotices)
    .values({
      id: WARNING_BANNER_NOTICE_ID,
      enabled,
      message,
      linkLabel,
      linkUrl,
      updatedById: session.user.id,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: siteNotices.id,
      set: {
        enabled,
        message,
        linkLabel,
        linkUrl,
        updatedById: session.user.id,
        updatedAt,
      },
    });

  revalidateTag(SITE_NOTICE_CACHE_TAG, "max");
  revalidatePath("/");
  revalidatePath("/admin");
}

function readOptionalText(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function assertAllowedNoticeUrl(url: string | null): void {
  if (!url) return;
  if (url.startsWith("/") && !url.startsWith("//")) return;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return;
  } catch {
    throw new Error("公告链接必须是站内路径、http URL 或 https URL。");
  }

  throw new Error("公告链接必须是站内路径、http URL 或 https URL。");
}
