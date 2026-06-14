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
```

The service role key is reserved for future server-only automations. Never expose it in client code.

## Supabase setup

1. Open the Supabase SQL editor.
2. Run `supabase/migrations/001_projectedge_crm.sql`.
3. Run `supabase/migrations/002_support_tickets.sql`.
4. Create an admin user in Supabase Auth.
5. Add the admin user to `public.admin_users`.

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
2. Add the same environment variables in Vercel Project Settings.
3. Push to `main`.
4. Vercel will deploy the new `www.projectedge.hu` production site.

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
