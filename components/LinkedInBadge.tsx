"use client";

import Script from "next/script";

// LinkedIn's official embeddable profile badge. The widget script scans the
// page for a .LI-profile-badge element on load and replaces its contents —
// the markup below is LinkedIn's required structure, not decorative. Using
// next/script (strategy="lazyOnload") instead of a raw <script> tag in JSX
// is required for App Router: a plain <script> in server-rendered JSX either
// gets stripped or re-runs on every client navigation, and lazyOnload
// matches the original tag's async+defer intent — the badge is
// below-the-fold and shouldn't compete with anything else on the page.
export function LinkedInBadge() {
  return (
    <>
      <div
        className="badge-base LI-profile-badge"
        data-locale="en_US"
        data-size="medium"
        data-theme="dark"
        data-type="VERTICAL"
        data-vanity="aristolegion"
        data-version="v1"
      >
        <a
          className="badge-base__link LI-simple-link"
          href="https://in.linkedin.com/in/aristolegion?trk=profile-badge"
        >
          Uday Anshuman
        </a>
      </div>
      <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="lazyOnload" />
    </>
  );
}
