import "server-only";

import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@/auth";

export const getCurrentSession = cache(
  async (): Promise<Session | null> => auth(),
);
