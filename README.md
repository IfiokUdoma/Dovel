# Dovel

AI-generated video entertainment and micro-drama streaming platform.

## Stack

- Next.js App Router, React 19, TypeScript and Tailwind CSS
- Supabase Auth, Postgres and Row Level Security
- Cloudinary signed uploads and video delivery
- Paystack NGN checkout with server-side verification and idempotent coin credits
- Vercel deployment

## Local setup

1. Use Node.js 20 or newer.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the credentials.
4. Apply every SQL migration in `supabase/migrations` in filename order.
5. Start the app: `npm run dev`.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, or `PAYSTACK_SECRET_KEY` in client-side code or commit them to Git.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service role key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Server-only Cloudinary API secret |
| `PAYSTACK_SECRET_KEY` | Server-only Paystack secret key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key used by the client checkout flow |
| `NEXT_PUBLIC_APP_URL` | Canonical app origin, e.g. `https://your-domain.vercel.app` in production |

## Supabase Auth configuration

In Supabase Authentication URL Configuration, set the production Site URL to the deployed Dovel origin. Add both local and production callback URLs to the allowed Redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://https://dovel-seven.vercel.app/

The signup flow sends email confirmation links through `/auth/callback`, which exchanges the confirmation code for a session before redirecting into Dovel.

## Payments

- Coin bundles and prices are defined server-side in `src/lib/payments/paystack.ts`.
- Checkout initialization requires an authenticated user and creates a pending payment order.
- The callback and webhook both verify the transaction directly with Paystack before crediting coins.
- The database credit function is service-role-only and locks the order to prevent duplicate credits.
- Configure the Paystack webhook URL as `https://YOUR-DEPLOYED-DOMAIN/api/payments/webhook`.
- Start with Paystack test keys. Switch to live keys only after production callback and webhook tests pass.

## Deploying to Vercel

1. Import the GitHub repository into Vercel and deploy the intended branch.
2. Add every variable from the Environment Variables section to Vercel for the correct environments. Production must use the production `NEXT_PUBLIC_APP_URL`.
3. Confirm the Supabase production URL and callback allowlist.
4. Set the Paystack webhook to the production webhook URL.
5. Deploy and test signup confirmation, login/logout, studio submission, admin moderation, episode playback, coin checkout, wallet balance and paid-episode unlock.
6. Keep Paystack in test mode until the end-to-end payment checks pass.

## Implemented MVP functionality

- Unified user account for watching and submitting AI-generated productions
- Production and episode submission with admin moderation
- Public catalogue, Explore discovery and episode watch pages
- Free previews and coin-based paid episode unlocks
- Wallet, transaction history and Paystack coin purchases
- Signed Cloudinary upload flow
- Admin-only moderation actions backed by database authorization checks

Creator payouts, commission calculations and AI dubbing/localization are intentionally outside the MVP scope.
