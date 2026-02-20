import { createClient } from '@supabase/supabase-js';

// Validate URL is actually a proper URL, not just a truthy string
function getSafeUrl(envVal: string | undefined): string {
  const val = (envVal || '').trim();
  if (val && val.startsWith('https://') && val.includes('.')) return val;
  return 'https://placeholder.supabase.co';
}

function getSafeKey(envVal: string | undefined): string {
  const val = (envVal || '').trim();
  return val || 'placeholder-key';
}

const supabaseUrl = getSafeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = getSafeKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Create client with validated fallback values to prevent build errors
// These will be validated at runtime in API routes
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client (for API routes)
export function createServerClient() {
  const url = getSafeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = getSafeKey(process.env.SUPABASE_SERVICE_ROLE_KEY);

  // At build time, return a stub client that won't crash
  // At runtime, the real env vars will be available
  if (url === 'https://placeholder.supabase.co' || serviceRoleKey === 'placeholder-key') {
    console.warn('[Supabase] Server client using placeholder — env vars not available (build time?)');
    return createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
