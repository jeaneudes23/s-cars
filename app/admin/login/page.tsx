import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { isSignedIn } from "@/lib/server/auth";

export default async function LoginPage() {
  if (await isSignedIn().catch(() => false)) redirect("/admin");
  return <LoginForm />;
}
