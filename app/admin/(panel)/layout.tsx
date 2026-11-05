import { redirect } from "next/navigation";
import { Shell } from "@/components/admin/Shell";
import { isSignedIn } from "@/lib/server/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const signedIn = await isSignedIn().catch(() => false);
  if (!signedIn) redirect("/admin/login");
  return <Shell>{children}</Shell>;
}
