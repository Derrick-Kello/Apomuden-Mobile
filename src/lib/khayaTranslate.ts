import type { KhayaRuntimeConfig } from '@/constants/khaya';

import { normalizeKhayaTextResponse } from '@/lib/khayaText';

export async function khayaTranslate(
  text: string,
  languagePair: string,
  config: KhayaRuntimeConfig
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Nothing to translate.');
  }

  const res = await fetch(config.translateUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': 'application/json',
      'Cache-Control': config.cacheControl,
    },
    body: JSON.stringify({ in: trimmed, lang: languagePair }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Khaya translate (${res.status}): ${raw}`);
  }

  return normalizeKhayaTextResponse(raw);
}
