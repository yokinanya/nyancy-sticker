"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { FeedbackProvider } from "@/components/feedback";

export function Providers({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FeedbackProvider>{children}</FeedbackProvider>
    </ThemeProvider>
  );
}
