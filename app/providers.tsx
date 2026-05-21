"use client";

import { I18nProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({
  children,
  lang,
}: {
  children: ReactNode;
  lang: string;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider locale={lang}>{children}</I18nProvider>
    </ThemeProvider>
  );
}
