import { requireAdmin } from "@/lib/auth-helpers";
import { getWarningBannerNotice } from "@/lib/queries/site-notice";
import { NoticeSettingsForm } from "./notice-settings-form";

export async function NoticePanel() {
  await requireAdmin();
  const notice = await getWarningBannerNotice();

  return <NoticeSettingsForm notice={notice} />;
}
