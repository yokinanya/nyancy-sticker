import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const metadata = { title: "登录" };

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await auth();
  if (session?.user?.id) redirect("/");
  const { callbackUrl } = await searchParams;

  async function loginAction() {
    "use server";
    await signIn("github", { redirectTo: callbackUrl ?? "/" });
  }

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">登录到 猫猫冲表情站</h1>
      <p className="text-sm text-default-500">投稿和后台管理需要使用 GitHub 账号登录。</p>
      <LoginForm action={loginAction} />
    </main>
  );
}
