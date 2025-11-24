# Environment Variables Setup

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Get your Supabase Service Role Key:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project
   - Go to **Settings** > **API**
   - Copy the `service_role` key (NOT the `anon` key)
   - Paste it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`

3. **Add your Stripe keys:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Copy your **Secret key** and **Publishable key**
   - Add them to `.env.local`

4. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

## Required Variables

### Supabase (Required)
- `NEXT_PUBLIC_SUPABASE_URL` - Already set in .env.example
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Already set in .env.example  
- `SUPABASE_SERVICE_ROLE_KEY` - **You need to add this manually**

### Stripe (Required for payments)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Optional, for webhooks

### Google Maps (Optional)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - Only needed if using address autocomplete

### Zoom (Required for video appointments)
- `ZOOM_API_KEY` - Your Zoom Server-to-Server OAuth API Key
- `ZOOM_API_SECRET` - Your Zoom Server-to-Server OAuth API Secret
- `ZOOM_ACCOUNT_ID` - Your Zoom Account ID

### ClickSend (Required for SMS notifications)
- `CLICKSEND_USERNAME` - Your ClickSend API username
- `CLICKSEND_API_KEY` - Your ClickSend API key
- `CLICKSEND_SENDER_ID` - Optional, your ClickSend sender ID (defaults to "Medazon")
- `SMS_TEMPLATE` - Optional, custom SMS message template (see SMS Template section below)

### SMTP (Required for email notifications)
- `SMTP_HOST` - Your SMTP server hostname (e.g., smtp.gmail.com, smtp.sendgrid.net)
- `SMTP_PORT` - SMTP port (usually 587 for TLS or 465 for SSL)
- `SMTP_USER` - Your SMTP username/email
- `SMTP_PASSWORD` - Your SMTP password or app-specific password
- `SMTP_FROM` - Email address to send from (defaults to SMTP_USER)

### Application URL (Optional)
- `NEXT_PUBLIC_APP_URL` - Your application's base URL (e.g., https://medazonhealth.com). If not set, will be auto-detected from request headers.

## Troubleshooting

### Error: "Missing Supabase server environment variables"

This means your `.env.local` file is missing or the variables aren't loaded.

**Solution:**
1. Make sure `.env.local` exists in the project root (same folder as `package.json`)
2. Check that `SUPABASE_SERVICE_ROLE_KEY` is set
3. **Restart your dev server** - Next.js only loads env vars on startup

### Variables not loading?

- Make sure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Check for typos in variable names
- Restart your dev server after adding variables
- For `NEXT_PUBLIC_*` variables, they're available in both client and server
- For server-only variables (like `SUPABASE_SERVICE_ROLE_KEY`), they're only available in API routes

## Security Notes

⚠️ **Never commit `.env.local` to git** - It's already in `.gitignore`

⚠️ **Never expose `SUPABASE_SERVICE_ROLE_KEY`** - It has admin privileges

⚠️ **Never expose `STRIPE_SECRET_KEY`** - It can access your Stripe account

⚠️ **Never expose Zoom credentials** - `ZOOM_API_KEY`, `ZOOM_API_SECRET`, and `ZOOM_ACCOUNT_ID` can create meetings on your behalf

