import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

import type { KhayaRuntimeConfig } from '@/constants/khaya';

/**
 * Safe base64 encoder — processes in chunks to avoid call-stack overflow
 * that corrupts audio data when using String.fromCharCode on large buffers.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Derive a file extension from the Content-Type header. */
function extFromContentType(ct: string | null): string {
  if (!ct) return 'mp3';
  if (ct.includes('wav'))  return 'wav';
  if (ct.includes('ogg'))  return 'ogg';
  if (ct.includes('aac'))  return 'aac';
  if (ct.includes('mp4'))  return 'm4a';
  return 'mp3';
}

export async function khayaSynthesizeToCacheFile(
  text: string,
  language: string,
  config: KhayaRuntimeConfig
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Nothing to synthesize.');
  if (!FileSystem.cacheDirectory) throw new Error('File cache is not available on this platform.');

  const res = await fetch(config.ttsUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.subscriptionKey,
      'Content-Type': 'application/json',
      'Cache-Control': config.cacheControl,
    },
    body: JSON.stringify({ text: trimmed, language }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Khaya TTS (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type');
  const ext = extFromContentType(contentType);

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) throw new Error('Khaya TTS returned empty audio.');

  const base64 = arrayBufferToBase64(buf);
  const path = `${FileSystem.cacheDirectory}khaya-tts-${Date.now()}.${ext}`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

export async function playLocalAudioAndWait(uri: string): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: false, volume: 1.0 },
  );

  await new Promise<void>((resolve, reject) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        if ('error' in status && status.error) {
          sound.setOnPlaybackStatusUpdate(null);
          void sound.unloadAsync();
          reject(new Error(`Playback error: ${String(status.error)}`));
        }
        return;
      }
      if (status.didJustFinish) {
        sound.setOnPlaybackStatusUpdate(null);
        void sound.unloadAsync().then(() => resolve(), reject);
      }
    });

    void sound.playAsync().catch(reject);
  });
}
