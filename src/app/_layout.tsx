import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import Auth from '@/components/auth';
import Onboarding from '@/components/onboarding';
import TabBar from '@/components/tab-bar';
import { supabase } from '@/lib/supabase';
import { getPref, setPref } from '@/lib/storage';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [bootDone, setBootDone]   = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    // Rehydrate session and local prefs in parallel
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id);
        const v = await getPref<boolean>('onboarded', false);
        setOnboarded(v);
      }
      setBootDone(true);
    });

    // Keep userId in sync when the session changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (!session) setOnboarded(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthed = async (id: string) => {
    setUserId(id);
    const v = await getPref<boolean>('onboarded', false);
    setOnboarded(v);
  };

  if (!bootDone) return null;

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!userId) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Auth onAuthed={handleAuthed} />
      </ThemeProvider>
    );
  }

  // ── Onboarding gate ──────────────────────────────────────────────────────────
  if (!onboarded) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Onboarding onComplete={() => setOnboarded(true)} />
      </ThemeProvider>
    );
  }

  // ── Main app ─────────────────────────────────────────────────────────────────
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Tabs
        tabBar={() => <TabBar />}
        screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="assistant" />
        <Tabs.Screen name="learn" />
        <Tabs.Screen name="profile" />
        {/* Utility screens — hidden from tab bar */}
        <Tabs.Screen name="explore"    options={{ href: null }} />
        <Tabs.Screen name="khaya-demo" options={{ href: null }} />
        <Tabs.Screen name="news/[id]"  options={{ href: null }} />
      </Tabs>
    </ThemeProvider>
  );
}
