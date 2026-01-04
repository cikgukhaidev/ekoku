-- Create enum for kokurikulum category
CREATE TYPE public.kokurikulum_category AS ENUM ('sukan_permainan', 'unit_uniform', 'persatuan_kelab');

-- Add category column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN kokurikulum_category public.kokurikulum_category NULL;