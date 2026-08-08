-- 022_security_hardening.sql
--
-- Public support conversations and notifications are now accessed through
-- server routes. The browser must not have table-level access to either data
-- set, even though it knows the public Supabase key.

revoke all on public.support_tickets from anon;
revoke all on public.support_ticket_messages from anon;
revoke all on public.notifications from anon;
revoke all on public.admin_users from anon;
revoke all on public.quote_requests from anon;
revoke all on public.clients from anon;
revoke all on public.projects from anon;

revoke all on public.support_tickets from authenticated;
revoke all on public.support_ticket_messages from authenticated;
revoke all on public.notifications from authenticated;

grant select, insert, update, delete on public.support_tickets to authenticated;
grant select, insert, update, delete on public.support_ticket_messages to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.quote_requests to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

drop policy if exists "Anyone can create quote requests" on public.quote_requests;
drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (public.is_admin());

drop policy if exists "Visitors can create support tickets" on public.support_tickets;
drop policy if exists "Visitors can read support tickets by app route" on public.support_tickets;
drop policy if exists "Visitors can rate closed support tickets" on public.support_tickets;
drop policy if exists "Admins can manage support tickets" on public.support_tickets;
create policy "Admins can manage support tickets"
on public.support_tickets for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Visitors can create customer messages" on public.support_ticket_messages;
drop policy if exists "Visitors can read ticket messages by app route" on public.support_ticket_messages;
drop policy if exists "Admins can manage ticket messages" on public.support_ticket_messages;
create policy "Admins can manage ticket messages"
on public.support_ticket_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid() or (user_id is null and public.is_admin()));

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid() or (user_id is null and public.is_admin()))
with check (user_id = auth.uid() or (user_id is null and public.is_admin()));

drop policy if exists "Anyone can insert notifications" on public.notifications;
drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
on public.notifications for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications for delete
to authenticated
using (user_id = auth.uid() or (user_id is null and public.is_admin()));

-- These tables were introduced later than the original grant block. Keep the
-- privileges explicit so policies also work on a clean Supabase project.
grant select, insert, update, delete on public.subscription_payments to authenticated;
grant select, insert, update, delete on public.change_requests to authenticated;
revoke all on public.subscription_payments from anon;
revoke all on public.change_requests from anon;

notify pgrst, 'reload schema';
