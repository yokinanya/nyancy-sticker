import { redirect } from "next/navigation";
import { ADMIN_TAB_ROUTES, type AdminTab } from "./admin-tabs";

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminRedirectPage({ searchParams }: PageProps) {
  const values = await searchParams;
  const rawTab = single(values.tab);
  const tab = isAdminTab(rawTab) ? rawTab : "submissions";
  const params = toSearchParams(values);
  params.delete("tab");
  const query = params.toString();
  redirect(`${ADMIN_TAB_ROUTES[tab]}${query ? `?${query}` : ""}`);
}

function isAdminTab(value: string | undefined): value is AdminTab {
  return Boolean(value && value in ADMIN_TAB_ROUTES);
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toSearchParams(
  values: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value !== undefined) params.set(key, value);
  }
  return params;
}
