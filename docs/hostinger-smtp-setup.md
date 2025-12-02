# Hostinger SMTP Email Setup Guide

This guide explains how to configure SMTP for Hostinger email accounts.

## Quick Setup

### Step 1: Create Email Account in Hostinger

1. Log in to your **Hostinger hPanel** (control panel)
2. Go to **Email** section
3. Click **Create Email Account**
4. Enter email address (e.g., `noreply@yourdomain.com`)
5. Set a strong password
6. Click **Create**

### Step 2: Get SMTP Settings

Hostinger provides two SMTP server options:

**Option A: Standard Hostinger SMTP (Recommended)**
- **SMTP Host**: `smtp.hostinger.com`
- **SMTP Port**: `587` (TLS) or `465` (SSL)
- **Username**: Full email address (e.g., `noreply@yourdomain.com`)
- **Password**: Your email account password

**Option B: Titan Email SMTP (For newer accounts)**
- **SMTP Host**: `smtp.titan.email`
- **SMTP Port**: `587` (TLS) or `465` (SSL)
- **Username**: Full email address
- **Password**: Your email account password

### Step 3: Add to .env.local

Add these lines to your `.env.local` file:

```env
# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@yourdomain.com
```

**Important:**
- Replace `noreply@yourdomain.com` with your actual Hostinger email address
- Replace `your-email-password` with your actual email account password
- Use the **full email address** as `SMTP_USER`, not just the username

### Step 4: Test Configuration

1. **Restart your dev server**:
   ```bash
   pnpm dev
   ```

2. **Test the email**:
   - Visit `http://localhost:3000/test-notifications`
   - Select "Email Only"
   - Enter your test email address
   - Click "Send Test Notifications"

## Troubleshooting

### Error: "535 Incorrect authentication data"

**Solutions:**

1. **Verify you're using the full email address**:
   - ✅ Correct: `SMTP_USER=noreply@yourdomain.com`
   - ❌ Wrong: `SMTP_USER=noreply`

2. **Try different SMTP host**:
   - If `smtp.hostinger.com` doesn't work, try `smtp.titan.email`

3. **Try different port**:
   - If port `587` doesn't work, try port `465`
   - Update `.env.local`:
     ```env
     SMTP_PORT=465
     ```
   - Note: Port 465 uses SSL, port 587 uses TLS

4. **Verify email password**:
   - Make sure you're using the **email account password**, not your hosting account password
   - Try resetting the email password in Hostinger hPanel

5. **Check email account status**:
   - Make sure the email account is active in Hostinger
   - Verify the email account exists in your Hostinger control panel

### Error: "Connection timeout"

**Solutions:**

1. **Check firewall settings** - Make sure port 587 or 465 is not blocked
2. **Try port 465** instead of 587
3. **Contact Hostinger support** - They may need to enable SMTP access

### Still Not Working?

1. **Contact Hostinger Support**:
   - They can verify your SMTP settings
   - They can check if SMTP is enabled for your account
   - They may provide alternative SMTP settings

2. **Alternative: Use Gmail or SendGrid**:
   - See other options in `docs/clicksend-smtp-setup.md`
   - Gmail with App Password is often more reliable for development

## Example Configuration

Here's a complete example for a Hostinger email account:

```env
# Hostinger Email Account: noreply@medazonhealth.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@medazonhealth.com
SMTP_PASSWORD=YourSecurePassword123!
SMTP_FROM=noreply@medazonhealth.com
```

## Security Notes

⚠️ **Never commit `.env.local` to git** - It contains your email password

⚠️ **Use a dedicated email account** - Don't use your personal email for sending automated emails

⚠️ **Use strong passwords** - Your email account password should be strong and unique

⚠️ **Monitor email usage** - Check your Hostinger email account regularly for any issues








