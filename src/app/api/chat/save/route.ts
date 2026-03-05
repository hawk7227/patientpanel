import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { sessionId, messages } = await req.json();

    // TODO: Insert into your database
    // await db.chats.create({ sessionId, messages, timestamp: new Date() });

    console.log(`[Database] Saved chat for session ${sessionId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}