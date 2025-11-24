# Supabase Migrations

## Fix Appointments Status Constraint

### Problem
The `appointments_status_check` constraint doesn't allow the "approved" status value, causing insert errors.

### Solution
Run the SQL migration to update the constraint:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix-appointments-status-constraint.sql`
4. Click **Run** to execute the migration

### What it does
- Drops the existing `appointments_status_check` constraint
- Creates a new constraint that includes 'approved' along with other valid statuses:
  - pending
  - confirmed
  - approved
  - cancelled
  - completed
  - no_show
  - rescheduled

### After running
Once the migration is complete, appointments can be created with "approved" status without errors.

---

## Add Zoom Start URL Column

### Problem
The appointments table needs to store the Zoom meeting start URL so admins can start meetings from the admin panel.

### Solution
Run the SQL migration to add the column:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add-zoom-start-url.sql`
4. Click **Run** to execute the migration

### What it does
- Adds a `zoom_start_url` column to the `appointments` table
- This column stores the Zoom meeting start URL (for host/admin access)
- The start URL allows admins to start the meeting from the admin panel

### After running
Once the migration is complete, the `create-appointment` API will automatically save the Zoom start URL when creating video appointments.

