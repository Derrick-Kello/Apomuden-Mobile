import type { KhayaRuntimeConfig } from '@/constants/khaya';

import { normalizeKhayaTextResponse } from '@/lib/khayaText';

export async function transcribeWithKhaya(
  recordingUri: string,
  config: KhayaRuntimeConfig
): Promise<string> {
  const fileRes = await fetch(recordingUri);
  const blob = await fileRes.blob();

  const res = await fetch(config.asrUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': config.contentType,
      'Cache-Control': config.cacheControl,
    },
    body: blob,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Khaya ASR failed (${res.status}): ${raw}`);
  }

  return normalizeKhayaTextResponse(raw);
}
