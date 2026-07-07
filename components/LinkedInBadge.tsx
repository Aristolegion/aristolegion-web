"use client";

import Script from "next/script";

declare global {
  interface Window {
    LI?: { ProfileBadge?: { init?: () => void } };
  }
}

// LinkedIn's official embeddable profile badge. The widget script scans the
// page for a .LI-profile-badge element on load and replaces its contents —
// the markup below is LinkedIn's required structure, not decorative. Using
// next/script (strategy="lazyOnload") instead of a raw <script> tag in JSX
// is required for App Router: a plain <script> in server-rendered JSX either
// gets stripped or re-runs on every client navigation, and lazyOnload
// matches the original tag's async+defer intent — the badge is
// below-the-fold and shouldn't compete with anything else on the page.
//
// lazyOnload can fire after React has already hydrated the badge markup,
// which the LinkedIn script only scans for once on its own load — if it
// runs before the div is in the DOM (or has already run once for another
// instance), the badge silently never initializes. onLoad re-triggers
// LinkedIn's own init explicitly once the script is confirmed loaded, and
// next/script dedupes by src so this never results in a second script tag.
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
      <Script
        id="linkedin-badge-script"
        src="https://platform.linkedin.com/badges/js/profile.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.LI?.ProfileBadge?.init?.();
        }}
      />
    </>
  );
}
