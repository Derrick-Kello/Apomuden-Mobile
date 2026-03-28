import type { ExpoConfig } from 'expo/config';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type KhayaExtra = {
  asrUrl: string;
  translateUrl: string;
  ttsUrl: string;
  subscriptionKey: string;
  contentType: string;
  cacheControl: string;
};

const KHAYA_DEFAULTS: KhayaExtra = {
  asrUrl: 'https://translation-api.ghananlp.org/asr/v1/transcribe?language=tw',
  translateUrl: 'https://translation-api.ghananlp.org/v1/translate',
  ttsUrl: 'https://translation-api.ghananlp.org/tts/v1/tts',
  subscriptionKey: '',
  contentType: 'audio/mpeg',
  cacheControl: 'no-cache',
};

function parseHeaders(lines: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('{')) {
      continue;
    }
    if (/^(GET|POST)\s+/i.test(trimmed)) {
      continue;
    }
    const headerMatch = line.match(/^([^:]+):\s*(.+)$/);
    if (headerMatch) {
      headers[headerMatch[1].trim().toLowerCase()] = headerMatch[2].trim();
    }
  }
  return headers;
}

function parseAsrFromAiTxt(contents: string): Partial<KhayaExtra> {
  if (!contents.trim()) {
    return {};
  }
  const lines = contents.split(/\r?\n/);
  const firstLine = lines.find((l) => l.trim().startsWith('POST '));
  if (!firstLine) {
    return {};
  }
  const postMatch = firstLine.match(/^POST\s+(\S+)\s+HTTP/i);
  const asrUrl = postMatch?.[1];
  const headers = parseHeaders(lines);
  return {
    ...(asrUrl ? { asrUrl } : {}),
    subscriptionKey: headers['ocp-apim-subscription-key'] ?? '',
    contentType: headers['content-type'] ?? KHAYA_DEFAULTS.contentType,
    cacheControl: headers['cache-control'] ?? KHAYA_DEFAULTS.cacheControl,
  };
}

function linesOf(contents: string): string[] {
  return contents.split(/\r?\n/);
}

function firstRequestLineUrl(contents: string): string | null {
  const line = linesOf(contents).find((l) => /^(GET|POST)\s+https?:\/\//i.test(l.trim()));
  if (!line) {
    return null;
  }
  const m = line.trim().match(/^(?:GET|POST)\s+(\S+)/i);
  return m?.[1] ?? null;
}

function translateUrlFromTranslationReference(contents: string): string | null {
  const url = firstRequestLineUrl(contents);
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    if (u.pathname.includes('/translate')) {
      return `${u.origin}${u.pathname}${u.search}`;
    }
    if (u.pathname.includes('/languages')) {
      return `${u.origin}/v1/translate`;
    }
    return `${u.origin}/v1/translate`;
  } catch {
    return null;
  }
}

function ttsUrlFromTtsReference(contents: string): string | null {
  const url = firstRequestLineUrl(contents);
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    if (u.pathname.includes('/tts/v1/tts')) {
      return `${u.origin}${u.pathname}${u.search}`;
    }
    if (u.pathname.includes('speakers')) {
      return `${u.origin}/tts/v1/tts`;
    }
    return `${u.origin}/tts/v1/tts`;
  } catch {
    return null;
  }
}

function subscriptionKeyFromReference(contents: string): string {
  const headers = parseHeaders(linesOf(contents));
  return headers['ocp-apim-subscription-key'] ?? '';
}

function readOptionalFile(name: string): string | null {
  const candidates = [join(__dirname, name), join(process.cwd(), name)];
  for (const p of candidates) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf8');
    }
  }
  return null;
}

function loadKhayaExtraFromReferenceFiles(): KhayaExtra {
  const ai = readOptionalFile('ai.txt');
  const translation = readOptionalFile('translation.txt');
  const ttsRef = readOptionalFile('text-to-speech.txt');

  const fromAi = ai ? parseAsrFromAiTxt(ai) : {};
  const translateUrl =
    (translation && translateUrlFromTranslationReference(translation)) ?? KHAYA_DEFAULTS.translateUrl;
  const ttsUrl = (ttsRef && ttsUrlFromTtsReference(ttsRef)) ?? KHAYA_DEFAULTS.ttsUrl;

  const keyFromAi = fromAi.subscriptionKey ?? '';
  const keyFromTr = translation ? subscriptionKeyFromReference(translation) : '';
  const keyFromTts = ttsRef ? subscriptionKeyFromReference(ttsRef) : '';
  const subscriptionKey = keyFromAi || keyFromTr || keyFromTts || KHAYA_DEFAULTS.subscriptionKey;

  return {
    asrUrl: fromAi.asrUrl ?? KHAYA_DEFAULTS.asrUrl,
    translateUrl,
    ttsUrl,
    subscriptionKey,
    contentType: fromAi.contentType ?? KHAYA_DEFAULTS.contentType,
    cacheControl: fromAi.cacheControl ?? KHAYA_DEFAULTS.cacheControl,
  };
}

const khaya = loadKhayaExtraFromReferenceFiles();

const base: ExpoConfig = {
  name: 'AuraHealth',
  slug: 'AuraHealth',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'aurahealth',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default (): ExpoConfig => ({
  ...base,
  extra: {
    ...(typeof base.extra === 'object' && base.extra !== null ? base.extra : {}),
    khaya,
  },
  plugins: [
    ...(base.plugins ?? []),
    [
      'expo-av',
      {
        microphonePermission:
          'Allow AuraHealth to use the microphone to record audio for Khaya speech recognition.',
      },
    ],
  ],
});
