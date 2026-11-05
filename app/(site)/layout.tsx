import { BookingProvider } from "@/components/site/booking";
import "./site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <BookingProvider>{children}</BookingProvider>;
}
