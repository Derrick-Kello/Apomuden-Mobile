import Constants from 'expo-constants';

export type KhayaRuntimeConfig = {
  asrUrl: string;
  translateUrl: string;
  ttsUrl: string;
  subscriptionKey: string;
  contentType: string;
  cacheControl: string;
};

export function getKhayaConfig(): KhayaRuntimeConfig | null {
  const extra = Constants.expoConfig?.extra as { khaya?: KhayaRuntimeConfig } | undefined;
  const k = extra?.khaya;
  if (
    !k?.asrUrl?.trim() ||
    !k?.translateUrl?.trim() ||
    !k?.ttsUrl?.trim() ||
    !k?.subscriptionKey?.trim()
  ) {
    return null;
  }
  return k;
}
