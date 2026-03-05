import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  
  // Log to server console
  console.log('[Analytics Event]', body.event, body.properties);

  // TODO: Forward to Google Analytics or Mixpanel server-side if needed
  
  return NextResponse.json({ success: true });
}