-- Migration: Fix appointments_status_check constraint to allow 'approved' status
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Step 2: Add the new constraint that includes 'approved'
-- Adjust the list of statuses based on what your application needs
ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'approved', 'cancelled', 'completed', 'no_show', 'rescheduled'));

-- Verify the constraint was updated
-- You can check by running:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'appointments'::regclass AND conname = 'appointments_status_check';

