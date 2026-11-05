import { Shell } from "@/components/admin/Shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
