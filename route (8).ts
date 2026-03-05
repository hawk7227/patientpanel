import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    // 1. Validate Input
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    // 2. Prepare Context for Claude
    // We add a system prompt to ensure it acts like a medical assistant
    const systemPrompt = `You are a helpful, empathetic medical assistant for Medazon Health. 
    Your goal is to gather symptoms for a telehealth assessment. 
    Keep responses concise (under 50 words). 
    Do not diagnose. 
    If the user mentions emergency keywords (chest pain, suicide, stroke), tell them to call 911 immediately.`;

    // 3. Call Claude API (Mocking the call structure for you to use)
     const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: message }]
      })
    });
    const data = await response.json();
    const reply = data.content[0].text;
    

    // FOR DEMO PURPOSES (Since you might not have a key yet):
    // We will simulate a smart response based on keywords
    //let reply = "I understand. Can you tell me how long you've been experiencing this?";
    //if (message.toLowerCase().includes('uti')) reply = "UTI symptoms can be very uncomfortable. Are you experiencing any fever or back pain along with it?";
    //if (message.toLowerCase().includes('weight')) reply = "We have great options for weight management. Have you tried medications like Semaglutide before?";

    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}