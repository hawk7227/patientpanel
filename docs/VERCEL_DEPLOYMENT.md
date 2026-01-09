# Vercel Deployment Guide

## Prerequisites
- Vercel account (free or paid)
- GitHub/GitLab/Bitbucket account
- All environment variables ready

## Quick Start

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js configuration

### 2. Set Environment Variables
In the Vercel dashboard, add the following environment variables:

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`

**Stripe:**
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

**APIs:**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `OPENAI_API_KEY`

**SMS & Email:**
- `CLICKSEND_USERNAME`
- `CLICKSEND_API_KEY`
- `NODEMAILER_EMAIL`
- `NODEMAILER_PASSWORD`

**Zoom:**
- `ZOOM_CLIENT_ID`
- `ZOOM_CLIENT_SECRET`

### 3. Deployment
- Vercel auto-deploys on every push to `main` branch
- Preview deployments created for pull requests
- Build logs available in Vercel dashboard

## Build Configuration
- **Build Command:** `next build`
- **Output Directory:** `.next`
- **Package Manager:** pnpm
- **Node Version:** 20.x

## Performance Optimizations
- API routes configured with 60s timeout
- Memory allocated: 1024MB per function
- Region: iad1 (US East Coast)

## Monitoring
- Check deployments at: https://vercel.com/dashboard
- View logs: Vercel Dashboard → Deployments → Logs
- Check analytics: Vercel Analytics

## Troubleshooting
1. **Build fails:** Check environment variables are set
2. **Function timeout:** Increase timeout in `vercel.json`
3. **Missing dependencies:** Ensure `pnpm-lock.yaml` is committed
