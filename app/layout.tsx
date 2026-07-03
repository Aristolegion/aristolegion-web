import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { siteMeta } from "@/lib/content/homepage";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = "https://aristolegion.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteMeta.title,
  description: siteMeta.description,
  keywords: [
    "Aristolegion",
    "Aristolegion Intelligence Journal",
    "Capability Dividend",
    "The Glass Partition",
    "Leadership Intelligence",
    "Human Capability Research",
    "Uday Anshuman",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    siteName: siteMeta.name,
    title: siteMeta.title,
    description: siteMeta.description,
    url: SITE_URL,
    type: "website",
    images: ["/images/crest.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: siteMeta.title,
    description: siteMeta.description,
    images: ["/images/crest.png"],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aristolegion",
  url: SITE_URL,
  logo: `${SITE_URL}/images/crest.png`,
  founder: {
    "@type": "Person",
    name: "Uday Anshuman",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aristolegion",
  url: SITE_URL,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
