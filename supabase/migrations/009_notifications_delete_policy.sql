-- Allow users to delete their own notifications (admins can also clear broadcast ones).
-- Without this DELETE policy, "Olvasottak törlése" / clearing notifications was
-- silently blocked by RLS.
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_admin()));

notify pgrst, 'reload schema';
