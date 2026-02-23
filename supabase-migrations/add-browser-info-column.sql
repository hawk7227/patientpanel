-- Add browser_info column to appointments table
-- Stores device/browser information for each appointment booking
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS browser_info text;

COMMENT ON COLUMN appointments.browser_info IS 'JSON string of browser/device info captured at booking time (userAgent, screen, language, platform, timezone, touchSupport, connectionType)';
