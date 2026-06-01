import { NextResponse } from 'next/server';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt, model = 'gemma4:latest', system, options } = body;
    if (!prompt) return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });

    const ollamaRes = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, system, options, stream: false }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      return NextResponse.json({ error: `Ollama error: ${err}` }, { status: 502 });
    }

    const data = await ollamaRes.json();
    return NextResponse.json({ response: data.response });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
