import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

import type { KhayaRuntimeConfig } from '@/constants/khaya';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function khayaSynthesizeToCacheFile(
  text: string,
  language: string,
  config: KhayaRuntimeConfig
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Nothing to synthesize.');
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error('File cache is not available on this platform.');
  }

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

  const buf = await res.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  const path = `${FileSystem.cacheDirectory}khaya-tts-${Date.now()}.mp3`;
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

  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();

  await new Promise<void>((resolve, reject) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) {
        if ('error' in status && status.error) {
          sound.setOnPlaybackStatusUpdate(null);
          void sound.unloadAsync();
          reject(new Error(`Playback: ${String(status.error)}`));
        }
        return;
      }
      if (status.didJustFinish) {
        sound.setOnPlaybackStatusUpdate(null);
        void sound.unloadAsync().then(() => resolve(), reject);
      }
    });
  });
}
