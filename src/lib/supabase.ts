import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = (process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '').trim();
// Supports both EXPO_PUBLIC_SUPABASE_KEY and EXPO_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_ANON_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  ''
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:             AsyncStorage,
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  false,
  },
});

// ─── Interaction persistence ──────────────────────────────────────────────────
export interface InteractionPayload {
  user_id:  string;
  language: 'tw' | 'en';
  user_msg: string;
  aura_msg: string;
  source:   'voice' | 'chat';
  is_error?: boolean;
}

/** Fire-and-forget: saves an interaction to Supabase. Never throws. */
export async function saveInteraction(payload: InteractionPayload): Promise<void> {
  try {
    await supabase.from('interactions').insert({
      user_id:  payload.user_id,
      language: payload.language,
      user_msg: payload.user_msg,
      aura_msg: payload.aura_msg,
      source:   payload.source,
      is_error: payload.is_error ?? false,
    });
  } catch (e) {
    console.warn('[supabase] saveInteraction failed:', e);
  }
}

/** Signs the user out and clears the local session. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
