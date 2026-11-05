"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { logout } from "@/lib/auth";
import { DataGate, DataProvider } from "./data";
import { ToastProvider } from "./ui";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/cars", label: "Cars", icon: "car" },
  { href: "/admin/drivers", label: "Drivers", icon: "users" },
  { href: "/admin/driver-services", label: "Driver services", icon: "steering" },
  { href: "/admin/costs", label: "Costs", icon: "receipt" },
  { href: "/admin/revenue", label: "Revenue", icon: "trend" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <ToastProvider>
      <DataProvider>
        <a className="skip-link" href="#admin-main">Skip to content</a>
        <div className="a-shell">
          <aside className="a-side">
            <div className="a-side__top">
              <Link href="/admin" className="logo logo--light">SCARS<span className="logo__dot" aria-hidden="true" /></Link>
              <button type="button" className="a-menu-btn" aria-expanded={menuOpen} aria-controls="adminNav" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>
                <Icon name={menuOpen ? "x" : "menu"} />
              </button>
            </div>
            <div className={`a-side__menu ${menuOpen ? "is-open" : ""}`} id="adminNav">
              <nav aria-label="Admin">
                {NAV.map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  return (
                    <Link key={item.href} href={item.href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined}>
                      <Icon name={item.icon} />{item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="a-side__foot">
                <a href="/" className="a-side__link"><Icon name="globe" />View website</a>
                <button type="button" className="a-side__link" onClick={logout}>
                  <Icon name="logout" />Log out
                </button>
              </div>
            </div>
          </aside>
          <main className="a-main" id="admin-main"><DataGate>{children}</DataGate></main>
        </div>
      </DataProvider>
    </ToastProvider>
  );
}
