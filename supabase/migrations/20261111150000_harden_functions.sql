-- Address Supabase security advisor warnings (2026-11-11).
-- Safe to apply: no table or data changes.

-- 1. Pin search_path on functions (lint 0011_function_search_path_mutable).
alter function public.handle_new_user() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;

-- 2. handle_new_user is a SECURITY DEFINER trigger function on auth.users.
--    It should only run from the trigger, never via /rest/v1/rpc
--    (lints 0028 / 0029). Triggers keep working after this revoke.
revoke execute on function public.handle_new_user() from anon, authenticated, public;
