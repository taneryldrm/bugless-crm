-- Improved Personnel Delete Function
-- This handles foreign key constraints by removing or unlinking related data
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void AS $$
BEGIN
    -- 1. Unlink from Projects (Set manager to NULL so project isn't deleted)
    UPDATE public.projects 
    SET manager_id = NULL 
    WHERE manager_id = target_user_id;

    -- 2. Delete Personal Data (Data that belongs ONLY to this user)
    DELETE FROM public.work_sessions WHERE user_id = target_user_id;
    DELETE FROM public.calendar_events WHERE user_id = target_user_id;
    
    -- 3. Handle proposals (if exists)
    -- We'll use a dynamic check or just wrap in a block if it exists
    BEGIN
        UPDATE public.proposals SET user_id = NULL WHERE user_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if table or column doesn't exist
    END;

    -- 4. Finally delete from profiles and auth
    DELETE FROM public.profiles WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
