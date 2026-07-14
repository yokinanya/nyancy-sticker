import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireEditor } from "@/lib/auth-helpers";
import "./admin.css";

export const metadata: Metadata = {
  title: "后台管理 - 猫猫冲表情站",
};

export default async function AdminLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  await requireEditor();
  return children;
}
