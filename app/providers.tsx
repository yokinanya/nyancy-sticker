"use client";

import { I18nProvider, RouterProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { FeedbackProvider } from "@/components/feedback";

export function Providers({
  children,
  lang,
}: {
  children: ReactNode;
  lang: string;
}) {
  const router = useRouter();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider navigate={router.push}>
        <I18nProvider locale={lang}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </I18nProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
