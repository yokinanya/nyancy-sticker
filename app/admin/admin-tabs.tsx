export type AdminTab =
  | "submissions"
  | "stickers"
  | "duplicates"
  | "categories"
  | "upload"
  | "notice"
  | "users";

export const ADMIN_TAB_ROUTES: Readonly<Record<AdminTab, string>> = {
  submissions: "/admin/submissions",
  stickers: "/admin/stickers",
  duplicates: "/admin/duplicates",
  categories: "/admin/categories",
  upload: "/admin/upload",
  notice: "/admin/notice",
  users: "/admin/users",
};
