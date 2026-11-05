import { BookingProvider } from "@/components/site/booking";
import { listedCars } from "@/lib/server/records";
import "./site.css";

// Always current: a car changed in the admin shows on the next page load.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return <BookingProvider cars={await listedCars()}>{children}</BookingProvider>;
}
