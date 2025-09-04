-- Fix security vulnerability in notifications table
-- Replace the overly permissive INSERT policy with a secure one

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "insert notifications" ON public.notifications;

-- Create a more secure policy that only allows:
-- 1. System triggers (SECURITY DEFINER functions) to insert notifications
-- 2. Users to insert notifications for themselves only (if needed for future features)
CREATE POLICY "secure insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  -- Only allow inserts for the authenticated user's own notifications
  user_id = auth.uid()
);

-- Update the notify_on_assign function to use SECURITY DEFINER
-- This allows the trigger to bypass RLS when creating notifications
CREATE OR REPLACE FUNCTION public.notify_on_assign()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO public.notifications(user_id, subtask_id, type)
    VALUES (NEW.assignee_id, NEW.id, 'assigned');
  END IF;
  RETURN NEW;
END;
$$;