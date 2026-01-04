-- Add is_completed column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;