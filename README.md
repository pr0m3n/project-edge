# ProjectEdge Studio

Premium ProjectEdge website and lead-management system for `projectedge.hu`.

## Stack

- Next.js App Router
- Vercel deployment
- Supabase Postgres, Auth and Row Level Security
- Custom CSS based on the palette `#F5F5F5`, `#76ABAE`, `#303841`, `#FF5722`

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=ProjectEdge Studio <info@projectedge.hu>
RESEND_REPLY_TO=info@projectedge.hu
RESEND_NOTIFICATION_EMAIL=info@projectedge.hu
NEXT_PUBLIC_SITE_URL=https://www.projectedge.hu
```

The service role key is used by trusted server routes for public support and account
deletion flows. Never expose it in client code.

Transactional emails are sent through Resend and use the same visual language as the
ProjectEdge cold-email campaign. Verify `projectedge.hu` in Resend, then add
`RESEND_API_KEY` (and, if needed, the sender/reply-to overrides) to Vercel Production.
The app reports a visible warning when the key is missing instead of simulating a sent email.

## Client guide PDFs

The onboarding and handover guides are generated, not hand-designed:

```bash
python3 scripts/generate_guides.py
```

This writes four PDFs plus cover PNGs into `public/guides/`:
`projectedge-domainvasarlas-rackhost.pdf`, `projectedge-vercel-atadas.pdf`,
`projectedge-supabase-atadas.pdf` and `projectedge-resend-email.pdf`.
`lib/handover.ts` links each guided handover step to the matching file, so keep the
file names stable. The shared design system lives in `scripts/guide_kit.py` and
follows the website plus Resend email language (night `#1c1d20`, paper `#eeede8`,
ember `#ff5722`, aqua `#76abae`, mono kickers, terminal blocks).

Requires `reportlab`, `Pillow` (for screenshot crops) and `pdftoppm` (poppler) for
the cover PNGs. Rackhost screenshots come from `tmp/pdfs/domain-guide/`.

## Supabase setup

1. Open the Supabase SQL editor.
2. Run migrations `001` through `009`, then `011` through `025`, in filename order.
3. Do not run `010_lock_financial_columns.sql`; it is obsolete.
4. Create an admin user in Supabase Auth.
5. Add the admin user to `public.admin_users`.

Migrations are applied manually, in filename order. Note that
`010_lock_financial_columns.sql` is **obsolete — do not run it**; it is superseded by
`019_client_write_guard.sql`, which restricts client writes while the payment
integration is being replaced by Stripe. `018_private_client_assets.sql` makes the
`client-assets` and `client-logos` buckets private: uploads are addressed by object
path and opened through short-lived signed URLs (`lib/storage-assets.ts`).
`022_security_hardening.sql` removes anonymous table access from support tickets and
notifications; the public support widget uses the server API instead. `023` makes client
assets private and deduplicates purchase requests, `024` adds the bank-transfer purchase
state machine, and `025` enforces the current lower prices and AAM billing wording for new
projects.

To verify the 023–025 database changes without modifying anything, run the read-only
checks in `supabase/verify_023_025.sql` from the Supabase SQL Editor.

Example:

```sql
insert into public.admin_users (user_id, email, full_name)
values (
  'AUTH_USER_UUID_HERE',
  'admin@projectedge.hu',
  'ProjectEdge Admin'
);
```

## Vercel setup

1. Connect this repository to the existing Vercel project.
2. Add the same environment variables in Vercel Project Settings for Production,
   Preview and Development as appropriate.
3. Verify the Resend sending domain and set `RESEND_NOTIFICATION_EMAIL` to the
   actual internal inbox.
4. Push to `main`.
5. Vercel will deploy the new `www.projectedge.hu` production site.

Before accepting a real client, test registration, login, project creation, file
upload, admin reply, notification email, support ticket reply and account deletion
against the production Supabase project. Take a database backup before applying a
new migration.

## Pages

- `/` public premium business website
- `/ugyfelkapu` client login and registration
- `/ugyfelkapu/dashboard` authenticated client dashboard
- `/api/quote` disabled legacy quote endpoint
- `/api/tickets` public support ticket endpoint
- `/admin` Supabase Auth login
- `/admin/dashboard` client project, support ticket, and legacy lead management

## Admin flow

The public site does not show the admin link. Open `/admin` directly, sign in with the Supabase Auth user added to `public.admin_users`, then manage client projects and support tickets from `/admin/dashboard`.

Public quote requests are disabled. New projects should start through `/ugyfelkapu`, where authenticated clients can create projects and tickets.

The bottom-right support widget creates a chat-style ticket in `support_tickets` and stores the conversation in `support_ticket_messages`. The visitor can reopen the same browser and continue the conversation. Admin replies are sent from `/admin/dashboard`.

## Keep the old project

Before replacing the current production code, archive the old implementation in Git:

```bash
git checkout -b archive/trading-platform
git push origin archive/trading-platform
git checkout main
```

Then merge or replace `main` with this new ProjectEdge Studio code.
