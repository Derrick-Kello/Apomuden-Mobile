import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Config ───────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'index',     href: '/',          label: 'Home',  icon: 'home'      as const },
  { name: 'assistant', href: '/assistant', label: 'Apomuden',  icon: 'mic'       as const, fab: true },
  { name: 'learn',     href: '/learn',     label: 'Learn', icon: 'menu-book' as const },
  { name: 'profile',   href: '/profile',   label: 'Me',    icon: 'person'    as const },
] as const;

type Tab = typeof TABS[number];

// ─── Tab item ─────────────────────────────────────────────────────────────────
function TabItem({ tab, active, isDark }: { tab: Tab; active: boolean; isDark: boolean }) {
  const colors = Colors[isDark ? 'dark' : 'light'];

  // Single shared value drives all micro-animations
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(active ? 1 : 0, { damping: 20, stiffness: 260, mass: 0.6 });
  }, [active, p]);

  // Icon: subtle scale + vertical nudge
  const iconAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(p.value, [0, 1], [1, 1.08]) },
      { translateY: interpolate(p.value, [0, 1], [0, -1]) },
    ],
  }));

  // Label: opacity only — no movement, matches iOS behaviour
  const labelAnim = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.45, 1]),
  }));

  const activeColor   = isDark ? Brand.primaryLight : Brand.primary;
  const inactiveColor = colors.textTertiary;
  const iconColor     = active ? activeColor : inactiveColor;

  // ── FAB centre button (Apomuden) ──────────────────────────────────────────────
  if ('fab' in tab && tab.fab) {
    const fabAnim = useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(p.value, [0, 1], [1, 1.06]) }],
      shadowOpacity: interpolate(p.value, [0, 1], [0.18, 0.38]),
    }));

    return (
      <Pressable
        style={styles.fabWrap}
        onPress={() => router.navigate(tab.href)}
        accessibilityRole="button"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }}>
        <Animated.View style={[
          styles.fab,
          { backgroundColor: active ? Brand.primary : (isDark ? Brand.accent : Brand.primaryMuted) },
          fabAnim,
        ]}>
          <MaterialIcons name={tab.icon} size={24} color={active ? '#fff' : activeColor} />
        </Animated.View>
        <Animated.Text style={[styles.label, { color: iconColor }, labelAnim]}>
          {tab.label}
        </Animated.Text>
      </Pressable>
    );
  }

  // ── Regular tab ───────────────────────────────────────────────────────────
  return (
    <Pressable
      style={styles.tab}
      onPress={() => router.navigate(tab.href)}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}>
      <Animated.View style={iconAnim}>
        <MaterialIcons name={tab.icon} size={24} color={iconColor} />
      </Animated.View>
      <Animated.Text style={[styles.label, { color: iconColor }, labelAnim]}>
        {tab.label}
      </Animated.Text>
    </Pressable>
  );
}

// ─── Bar ──────────────────────────────────────────────────────────────────────
export default function TabBar() {
  const scheme   = useColorScheme();
  const isDark   = scheme === 'dark';
  const colors   = Colors[isDark ? 'dark' : 'light'];
  const insets   = useSafeAreaInsets();
  const pathname = usePathname();

  // Slide up once on mount
  const mountY = useSharedValue(8);
  useEffect(() => {
    mountY.value = withTiming(0, { duration: 320 });
  }, [mountY]);
  const mountAnim = useAnimatedStyle(() => ({ transform: [{ translateY: mountY.value }] }));

  const active = pathname === '/' ? 'index' : pathname.slice(1);

  const barBg = colors.tabBar;
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <Animated.View style={[styles.root, mountAnim]}>
      {/* Solid background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: barBg }]} />

      {/* Hairline separator */}
      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      {/* Tabs */}
      <View style={[styles.row, { paddingBottom: bottomPad }]}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.name}
            tab={tab}
            active={active === tab.name}
            isDark={isDark}
          />
        ))}
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Android elevation
    elevation: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 8,
    paddingHorizontal: 4,
  },

  // Regular tab
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingBottom: 2,
    minHeight: 48,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },

  // FAB (Apomuden centre)
  fabWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingBottom: 2,
    minHeight: 48,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    // Shadow
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
});
