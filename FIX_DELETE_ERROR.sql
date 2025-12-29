-- CRITICAL FIX: "record new has no field updated_at"
-- This happens because a trigger is trying to update a non-existent 'updated_at' column.

-- 1. Add missing updated_at columns to major tables to satisfy triggers
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.external_tasks ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Final Robust Delete Function
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void AS $$
BEGIN
    -- Unlink Manager from projects
    UPDATE public.projects SET manager_id = NULL WHERE manager_id = target_user_id;

    -- Delete personal data
    DELETE FROM public.work_sessions WHERE user_id = target_user_id;
    DELETE FROM public.calendar_events WHERE user_id = target_user_id;
    DELETE FROM public.personal_notes WHERE user_id = target_user_id;
    
    -- Unlink or delete assignments (using a safe way to handle arrays)
    -- Remove the user from work_orders.assigned_to array
    UPDATE public.work_orders 
    SET assigned_to = array_remove(assigned_to, target_user_id)
    WHERE target_user_id = ANY(assigned_to);

    -- Remove the user from external_tasks.assigned_to array
    UPDATE public.external_tasks 
    SET assigned_to = array_remove(assigned_to, target_user_id)
    WHERE target_user_id = ANY(assigned_to);

    -- Handle proposals (if exists)
    BEGIN
        UPDATE public.proposals SET user_id = NULL WHERE user_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN
    END;

    -- Delete from profiles and auth
    DELETE FROM public.profiles WHERE id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
