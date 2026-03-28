const ANTHROPIC_VERSION = '2023-06-01';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

function getApiKey(): string {
  const k = process.env.EXPO_PUBLIC_API_KEY?.trim();
  if (!k) throw new Error('Missing EXPO_PUBLIC_API_KEY');
  return k;
}

export type SupportedLanguage = 'tw' | 'en';

export const LANGUAGE_META: Record<SupportedLanguage, { name: string; native: string; code: string }> = {
  tw: { name: 'Twi', native: 'Twi', code: 'GH' },
  en: { name: 'English', native: 'English', code: 'EN' },
};

export const COMING_SOON_LANGUAGES = [
  { code: 'ga', name: 'Ga', native: 'Ga', region: 'GH' },
  { code: 'ee', name: 'Ewe', native: 'Eʋegbe', region: 'GH' },
  { code: 'ha', name: 'Hausa', native: 'Hausa', region: 'NG' },
  { code: 'dag', name: 'Dagbani', native: 'Dagbani', region: 'GH' },
];

export async function askHealthQuestion(englishQuestion: string): Promise<string> {
  const q = englishQuestion.trim();
  if (!q) throw new Error('Empty question.');

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system:
      'You are Apomuden, a trusted community health assistant. ' +
      'You provide accurate, easy-to-understand health information for people in West Africa. ' +
      'Focus on practical guidance: malaria, maternal health, nutrition, hygiene, common illnesses, preventive care, mental health. ' +
      'Always recommend seeing a healthcare professional for diagnosis or treatment decisions. ' +
      'Keep answers concise (2–4 sentences), warm, clear, and empowering. ' +
      'Never use medical jargon without a plain-language explanation.',
    messages: [{ role: 'user' as const, content: q }],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Apomuden (${res.status}): ${raw}`);

  const data = JSON.parse(raw) as { content?: Array<{ type: string; text?: string }> };
  const text = data.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) throw new Error('No response from Apomuden.');
  return text;
}
