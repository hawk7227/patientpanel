-- Migration: Add zoom_start_url column to appointments table
-- Run this in your Supabase SQL Editor

-- Add zoom_start_url column to store the Zoom meeting start URL (for admin/host access)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS zoom_start_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN appointments.zoom_start_url IS 'Zoom meeting start URL for host/admin to start the meeting';

