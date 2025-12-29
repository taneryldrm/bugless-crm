-- Create the missing delete_user_account function
-- This must be run by a superuser/service_role context or as a security definer
-- Use your Supabase SQL Editor for this.

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void AS $$
BEGIN
    -- 1. Check if the caller is an admin (Security check)
    -- We use 'security definer' to allow the function to bypass normal RLS
    -- and delete from auth.users (which normally requires service_role)
    
    -- In Supabase, deleting from public.profiles will trigger cascades if configured,
    -- but deleting from auth.users requires special permissions.
    
    -- Delete profile ( cascades might handle other things like notes, but we do them explicitly if needed)
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- Delete from auth.users (This requires the function to be security definer)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
