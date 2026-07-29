alter table public.client_projects
  add column if not exists followup_check_fee integer,
  add column if not exists followup_check_status text,
  add column if not exists followup_check_transfer_reported boolean not null default false,
  add column if not exists followup_check_due_at date,
  add column if not exists followup_check_completed_at timestamptz;

alter table public.client_projects
  drop constraint if exists client_projects_followup_check_fee_check;

alter table public.client_projects
  add constraint client_projects_followup_check_fee_check
  check (followup_check_fee is null or followup_check_fee > 0);

alter table public.client_projects
  drop constraint if exists client_projects_followup_check_status_check;

alter table public.client_projects
  add constraint client_projects_followup_check_status_check
  check (
    followup_check_status is null
    or followup_check_status in (
      'requested',
      'offered',
      'awaiting_transfer',
      'transfer_reported',
      'scheduled',
      'completed',
      'declined'
    )
  );

comment on column public.client_projects.followup_check_fee is
  'One-time gross fee for the optional 30-day post-launch technical check.';

comment on column public.client_projects.followup_check_due_at is
  'Planned date of the post-launch technical check, normally 30 days after payment verification.';

notify pgrst, 'reload schema';
