"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { BookButton, ChatLink } from "./booking";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#fleet", label: "Our fleet" },
  { href: "#locations", label: "Locations" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState("");
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);

    const sections = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setCurrent(`#${entry.target.id}`); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    LINKS.forEach((l) => { const s = document.querySelector(l.href); if (s) sections.observe(s); });

    const hero = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { rootMargin: "-120px 0px 0px 0px" });
    const heroEl = document.querySelector(".hero__inner");
    if (heroEl) hero.observe(heroEl);

    return () => { document.removeEventListener("keydown", onKey); sections.disconnect(); hero.disconnect(); };
  }, []);

  return (
    <>
      <header className={`nav ${scrolled ? "is-scrolled" : ""}`} id="top">
        <div className="container nav__inner">
          <a href="#top" className="logo" aria-label="SCARS home">SCARS<span className="logo__dot" aria-hidden="true" /></a>
          <nav className={`nav__links ${open ? "is-open" : ""}`} id="navLinks" aria-label="Main" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={current === l.href ? "is-current" : ""} aria-current={current === l.href ? "true" : undefined}>{l.label}</a>
            ))}
            <BookButton className="btn btn--amber nav__cta-mobile" onClickCapture={() => setOpen(false)}>Book now</BookButton>
          </nav>
          <BookButton className="btn btn--amber nav__cta">Book now</BookButton>
          <button ref={toggle} type="button" className="nav__toggle" aria-expanded={open} aria-controls="navLinks" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </header>
      <ChatLink className={`wa-float ${scrolled ? "is-visible" : ""}`} aria-label="Chat with SCARS on WhatsApp"><Icon name="whatsapp" /></ChatLink>
    </>
  );
}

// Fades its content in the first time it scrolls into view.
export function Reveal({ as: Tag = "div", className = "", children }: { as?: "div" | "li" | "figure"; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const Element = Tag as "div";
  return <Element ref={ref as React.Ref<HTMLDivElement>} className={`reveal ${shown ? "is-in" : ""} ${className}`}>{children}</Element>;
}
