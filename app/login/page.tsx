import { Suspense } from "react";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/current-session";
import { LoginForm } from "./login-form";

export const metadata = { title: "登录" };

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default function LoginPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (session?.user?.id) redirect("/");
  const { callbackUrl } = await searchParams;

  async function loginAction() {
    "use server";
    await signIn("github", { redirectTo: callbackUrl ?? "/" });
  }

  return (
    <main className="motion-page page-shell flex min-h-[60vh] max-w-md flex-col justify-center">
      <section className="surface flex flex-col gap-4 p-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">登录到 猫猫冲表情站</h1>
          <p className="mt-2 text-sm text-muted">投稿和后台管理需要使用 GitHub 账号登录。</p>
        </div>
        <LoginForm action={loginAction} />
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="page-shell flex min-h-[60vh] max-w-md flex-col justify-center">
      <section className="surface h-48 animate-pulse" />
    </main>
  );
}
