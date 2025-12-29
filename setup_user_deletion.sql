-- Function to strictly delete a user, intended for Admin use.
-- Deletes from public.profiles AND attempts to delete from auth.users.

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres)
SET search_path = public -- Secure search path
AS $$
BEGIN
  -- Check if the requester is an admin (Optional extra security, though RLS handles connection usually)
  -- We rely on the app to check isAdmin before calling this, but we can double check:
  IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'Yönetici'
  ) THEN
      RAISE EXCEPTION 'Yetkisiz işlem: Sadece yöneticiler kullanıcı silebilir.';
  END IF;

  -- 1. Delete from public.profiles
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 2. Delete from auth.users
  -- NOTE: This requires the function owner (postgres) to have access to auth schema.
  -- In standard Supabase setup, this works.
  DELETE FROM auth.users WHERE id = target_user_id;

EXCEPTION WHEN OTHERS THEN
    -- If auth.users deletion fails (e.g. FK constraints or permissions), 
    -- we re-raise.
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
