const ANTHROPIC_VERSION = '2023-06-01';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

function getApiKey(): string {
  const k = process.env.EXPO_PUBLIC_API_KEY?.trim();
  if (!k) {
    throw new Error(
      'Missing EXPO_PUBLIC_API_KEY. Add it to .env.local and restart Expo (Anthropic API key).'
    );
  }
  return k;
}

export async function claudeAnswerEnglishMinimal(englishQuestion: string): Promise<string> {
  const q = englishQuestion.trim();
  if (!q) {
    throw new Error('Empty question for Claude.');
  }

  const apiKey = getApiKey();
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: 'user' as const,
        content:
          'You are a helpful assistant. The user spoke in Twi; below is the English translation of their question.\n\n' +
          `Question:\n${q}\n\n` +
          'Reply with a short, clear answer in English only (at most 3 sentences). No preamble or meta-commentary.',
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Claude API (${res.status}): ${raw}`);
  }

  const data = JSON.parse(raw) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text?.trim();
  if (!text) {
    throw new Error('Claude returned no text.');
  }
  return text;
}
