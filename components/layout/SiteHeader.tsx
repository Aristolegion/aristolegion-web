"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { navLinks, siteMeta } from "@/lib/content/homepage";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold-muted bg-navy/95 backdrop-blur-sm">
      <Container>
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link
            href="/"
            className="flex items-center gap-3 text-ivory transition-colors duration-200 hover:text-gold"
          >
            <Image
              src="/images/crest-transparent.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-8 w-8 md:h-9 md:w-9"
            />
            <span className="font-display text-lg font-semibold uppercase tracking-[0.2em] md:text-xl">
              {siteMeta.name}
            </span>
          </Link>

          <nav
            className="hidden items-center gap-8 md:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-ivory md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">
              {menuOpen ? "Close menu" : "Open menu"}
            </span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </Container>

      <nav
        id="mobile-menu"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`overflow-hidden bg-navy transition-[max-height,opacity,border-color] duration-300 ease-out md:hidden ${
          menuOpen
            ? "max-h-96 border-t border-gold-muted opacity-100"
            : "max-h-0 border-t border-transparent opacity-0"
        }`}
      >
        <Container>
          <ul className="flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block py-3 font-body text-base font-medium text-ivory-muted transition-colors duration-200 hover:text-gold"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </header>
  );
}
