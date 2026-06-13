import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Divider } from "@/components/ui/Divider";
import { footerColumns, siteMeta } from "@/lib/content/homepage";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy text-ivory">
      <Divider />
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="font-display text-xl font-semibold uppercase tracking-[0.2em] text-ivory"
            >
              {siteMeta.name}
            </Link>
            <p className="mt-4 max-w-xs font-body text-sm leading-relaxed text-ivory-muted">
              {siteMeta.positioning}
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-body text-xs font-semibold uppercase tracking-[0.15em] text-gold">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-body text-sm text-ivory-muted transition-colors duration-200 hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Divider variant="muted" className="my-12" />

        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="font-body text-sm text-ivory-muted">
            &copy; {currentYear} {siteMeta.name}. All rights reserved.
          </p>
          <p className="font-display text-sm italic text-ivory-muted">
            {siteMeta.motto}
          </p>
        </div>
      </Container>
    </footer>
  );
}
