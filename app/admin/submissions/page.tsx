import { redirect } from "next/navigation";

export default function SubmissionsRedirect() {
  redirect("/admin?tab=submissions");
}
