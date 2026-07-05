This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Lead capture (Supabase)

The Inner Circle application form and newsletter signup write to Supabase
via the API routes in `app/api/inner-circle/apply` and
`app/api/newsletter/subscribe`. To enable them:

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor to create the
   `inner_circle_applications` and `newsletter_subscribers` tables with Row
   Level Security enabled and locked down (no anon policies — all access
   goes through our API routes using the service role key).
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL`
   and `SUPABASE_SERVICE_ROLE_KEY` from Settings > API in the Supabase
   dashboard. The service role key is server-only — never exposed to the
   browser — and must be kept secret (set it in your hosting provider's
   environment variables, not committed to git).

Without these variables set, both forms will show a graceful error message
on submit rather than a fake success — see `lib/supabase.ts`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
