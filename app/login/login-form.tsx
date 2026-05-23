"use client";

import { Button } from "@/components/ui/heroui-compat";

interface Props {
  action: () => Promise<void>;
}

export function LoginForm({ action }: Props) {
  return (
    <form action={action}>
      <Button type="submit" variant="primary" size="lg" className="motion-interactive">
        使用 GitHub 登录
      </Button>
    </form>
  );
}
