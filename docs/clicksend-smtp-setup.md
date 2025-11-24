# ClickSend SMS & SMTP Email Setup Guide

This guide explains how to set up ClickSend for SMS notifications and SMTP for email notifications when appointments are booked.

## Overview

When a patient books an appointment, the system will automatically:
1. Send an email confirmation with appointment details and access link
2. Send an SMS confirmation with appointment details and access link

Both notifications include a link to access the appointment page: `/appointment/[token]`

## ClickSend SMS Setup

### 1. Create a ClickSend Account

1. Go to [ClickSend](https://www.clicksend.com/)
2. Sign up for an account
3. Complete account verification

### 2. Get Your API Credentials

1. Log in to your ClickSend dashboard
2. Go to **Account** > **API Credentials**
3. Copy your **Username** and **API Key**

### 3. Configure Sender ID (Optional)

1. Go to **SMS** > **Sender IDs**
2. Create a sender ID (e.g., "Medazon")
3. Note: Some countries require sender ID approval

### 4. Add Environment Variables

Add these to your `.env.local` file:

```env
CLICKSEND_USERNAME=your_clicksend_username
CLICKSEND_API_KEY=your_clicksend_api_key
CLICKSEND_SENDER_ID=Medazon  # Optional, defaults to "Medazon"
```

## SMTP Email Setup

### Option 1: Gmail SMTP

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Security > 2-Step Verification > App passwords
   - Generate a password for "Mail"
3. **Add to `.env.local`**:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

### Option 2: SendGrid SMTP

1. Sign up at [SendGrid](https://sendgrid.com/)
2. Create an API key with "Mail Send" permissions
3. **Add to `.env.local`**:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@medazonhealth.com
```

### Option 3: AWS SES SMTP

1. Set up AWS SES and verify your email/domain
2. Create SMTP credentials in AWS SES console
3. **Add to `.env.local`**:

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # Use your region
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
SMTP_FROM=noreply@medazonhealth.com
```

### Option 4: Other SMTP Providers

Most SMTP providers follow the same pattern. Common settings:

- **Port 587**: TLS (recommended)
- **Port 465**: SSL
- **Port 25**: Usually blocked by hosting providers

## Application URL Configuration

The system needs to know your application's base URL to generate appointment links. You can set it explicitly:

```env
NEXT_PUBLIC_APP_URL=https://medazonhealth.com
```

If not set, the system will auto-detect from request headers (works in most cases).

## Testing

After configuration:

1. **Restart your dev server**:
   ```bash
   pnpm dev
   ```

2. **Book a test appointment** through the intake form

3. **Check**:
   - Email inbox for confirmation email
   - Phone for SMS confirmation
   - Both should contain the appointment link

## Troubleshooting

### SMS Not Sending

- Verify ClickSend credentials are correct
- Check ClickSend account has sufficient credits
- Verify phone number is in E.164 format (e.g., +1234567890)
- Check ClickSend dashboard for error messages

### Email Not Sending

- Verify SMTP credentials are correct
- For Gmail: Make sure you're using an App Password, not your regular password
- Check SMTP port (587 for TLS, 465 for SSL)
- Check firewall/network allows SMTP connections
- Review server logs for detailed error messages

### Links Not Working

- Ensure `NEXT_PUBLIC_APP_URL` is set correctly for production
- In development, links should work automatically
- Verify the appointment token is being generated correctly

## Security Notes

⚠️ **Never commit `.env.local` to git** - It contains sensitive credentials

⚠️ **Use App Passwords for Gmail** - Never use your main Gmail password

⚠️ **Rotate credentials regularly** - Especially if exposed or compromised

⚠️ **Use environment-specific credentials** - Different keys for dev/staging/production

