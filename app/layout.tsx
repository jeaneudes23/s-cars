import type { Metadata } from "next";
import { Outfit, Unbounded } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-unbounded" });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "SCARS | Car Rental in Kigali",
  description:
    "SCARS rents clean, reliable cars in Kigali, Rwanda. Airport pickup, self-drive or with a driver, 4x4s for Akagera and Volcanoes. Book on WhatsApp in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${unbounded.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
