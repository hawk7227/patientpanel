# Google Maps API Setup Guide

To enable the address and pharmacy autocomplete functionality, you need to obtain a Google Maps API key and configure it in your project.

## 1. Get a Google Maps API Key

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  **Enable APIs**:
    *   Go to **APIs & Services** > **Library**.
    *   Search for and enable **"Places API"** (New) or "Places API".
    *   Search for and enable **"Maps JavaScript API"**.
4.  **Create Credentials**:
    *   Go to **APIs & Services** > **Credentials**.
    *   Click **Create Credentials** > **API Key**.
    *   Copy the generated API key.

## 2. Configure Environment Variable

1.  Create a file named `.env.local` in the root of your project (`patientpanel/`).
2.  Add your API key to this file:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

> **Note:** Replace `your_api_key_here` with the actual key you copied.

## 3. Restrict Your API Key (Recommended)

To prevent unauthorized use of your API key:
1.  Go back to the **Credentials** page in Google Cloud Console.
2.  Click on your API key to edit it.
3.  Under **Application restrictions**, select **HTTP referrers (web sites)**.
4.  Add `http://localhost:3000/*` for development.
5.  Add your production domain (e.g., `https://your-app.com/*`) when you deploy.
6.  Under **API restrictions**, select **Restrict key** and choose:
    *   Places API
    *   Maps JavaScript API
7.  Save your changes.
