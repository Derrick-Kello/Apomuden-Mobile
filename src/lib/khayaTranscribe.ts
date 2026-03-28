import * as FileSystem from 'expo-file-system/legacy';

import type { KhayaRuntimeConfig } from '@/constants/khaya';

import { normalizeKhayaTextResponse } from '@/lib/khayaText';

/** Derive content-type from the actual file extension — more reliable than trusting config. */
function contentTypeFromUri(uri: string, fallback: string): string {
  const lower = uri.toLowerCase().split('?')[0] ?? '';
  if (lower.endsWith('.wav'))  return 'audio/wav';
  if (lower.endsWith('.m4a'))  return 'audio/m4a';
  if (lower.endsWith('.mp3'))  return 'audio/mpeg';
  if (lower.endsWith('.aac'))  return 'audio/aac';
  if (lower.endsWith('.ogg'))  return 'audio/ogg';
  if (lower.endsWith('.3gp'))  return 'audio/3gpp';
  if (lower.endsWith('.webm')) return 'audio/webm';
  return fallback;
}

export async function transcribeWithKhaya(
  recordingUri: string,
  config: KhayaRuntimeConfig
): Promise<string> {
  // Read the audio file as base64, then decode to raw bytes.
  // This is more reliable than the fetch→blob chain, which can produce
  // incorrect Content-Type headers or silently drop data on some RN versions.
  const base64 = await FileSystem.readAsStringAsync(recordingUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  // Chunked decode — avoids call-stack overflow on large recordings
  const CHUNK = 8192;
  for (let i = 0; i < binaryString.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, binaryString.length);
    for (let j = i; j < end; j++) {
      bytes[j] = binaryString.charCodeAt(j);
    }
  }

  const res = await fetch(config.asrUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': contentTypeFromUri(recordingUri, config.contentType),
      'Cache-Control': config.cacheControl,
    },
    body: bytes.buffer,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Khaya ASR failed (${res.status}): ${raw}`);
  }

  return normalizeKhayaTextResponse(raw);
}
