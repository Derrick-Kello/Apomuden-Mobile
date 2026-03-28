import { Icon } from '@/components/icon';
import { Audio } from 'expo-av';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { COMING_SOON_LANGUAGES, LANGUAGE_META, type SupportedLanguage } from '@/lib/claude-health';
import { getPref, setPref } from '@/lib/storage';

const { width: W, height: H } = Dimensions.get('window');

interface OnboardingProps {
  onComplete: () => void;
}

// ─── Step definitions ──────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;

// ─── Language card ─────────────────────────────────────────────────────────────
function LangCard({
  code, selected, onPress,
}: { code: SupportedLanguage; selected: boolean; onPress: () => void }) {
  const meta  = LANGUAGE_META[code];
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,    useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} style={lc.wrap}>
      <Animated.View style={[
        lc.card,
        selected && lc.cardSelected,
        { transform: [{ scale }] },
      ]}>
        <View style={[lc.iconCircle, { backgroundColor: selected ? 'rgba(255,255,255,0.25)' : Brand.primaryFaint }]}>
          <Icon
            name={{ ios: 'globe', android: 'language', web: 'globe' }}
            size={28}
            tintColor={selected ? '#FFFFFF' : Brand.primary}
          />
        </View>
        <Text style={[lc.name, { color: selected ? '#FFFFFF' : '#0D1F1C' }]}>{meta.name}</Text>
        <Text style={[lc.native, { color: selected ? 'rgba(255,255,255,0.8)' : '#4A6B63' }]}>{meta.native}</Text>
        {selected && (
          <View style={lc.check}>
            <Icon name={{ ios: 'checkmark', android: 'check', web: 'checkmark' }} size={13} tintColor="#FFFFFF" />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── Feature bullet ────────────────────────────────────────────────────────────
function FeatureBullet({ icon, title, sub, delay }: {
  icon: { ios: string; android: string; web: string };
  title: string; sub: string; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay, useNativeDriver: true }).start();
  }, [anim, delay]);
  const style = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  return (
    <Animated.View style={[fb.row, style]}>
      <View style={[fb.iconWrap, { backgroundColor: Brand.primaryFaint }]}>
        <Icon name={icon} size={18} tintColor={Brand.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={fb.title}>{title}</Text>
        <Text style={fb.sub}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Step dot indicator ────────────────────────────────────────────────────────
function StepDots({ current, light }: { current: number; light: boolean }) {
  return (
    <View style={dot.row}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            dot.dot,
            {
              width:           i === current ? 22 : 8,
              backgroundColor: i === current
                ? (light ? Brand.primary : '#FFFFFF')
                : (light ? Brand.primaryMuted : 'rgba(255,255,255,0.35)'),
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }: OnboardingProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep]           = useState(0);
  const [language, setLanguage]   = useState<SupportedLanguage>('tw');
  const [micGranted, setMicGranted] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [userName, setUserName]   = useState('Friend');

  // Fade/slide transition
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getPref<string>('name', 'Friend').then(setUserName);
  }, []);

  const goTo = (next: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -24, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(24);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 9, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      // Request mic permission
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setMicGranted(status === 'granted');
      } catch { /* proceed anyway */ }
      goTo(2);
      return;
    }
    if (step === 2) {
      setSaving(true);
      await setPref('onboarded', true);
      await setPref('language', language);
      setSaving(false);
      onComplete();
      return;
    }
    goTo(step + 1);
  };

  // ── Background colors per step ──────────────────────────────────────────────
  const bgColors = ['#FFFFFF', '#FFFFFF', Brand.primary];
  const isLight  = step < 2;
  const bg       = bgColors[step] ?? '#FFFFFF';

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Step dots */}
      <View style={[s.dotsWrap, { top: insets.top + 18 }]}>
        <StepDots current={step} light={isLight} />
      </View>

      {/* Animated content */}
      <Animated.View
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* ── Step 0: Language ── */}
        {step === 0 && (
          <View style={[s.page, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
            {/* Illustration */}
            <View style={s.illustrationArea}>
              <LottieView
                source={require('@/assets/lottie/welcome.json')}
                autoPlay loop
                style={s.lottie}
              />
              {/* Floating language pills */}
              <View style={[s.floatPill, s.floatLeft,  { backgroundColor: Brand.primaryFaint }]}>
                <Text style={[s.floatText, { color: Brand.primary }]}>Twi</Text>
              </View>
              <View style={[s.floatPill, s.floatRight, { backgroundColor: '#FEF9C3' }]}>
                <Text style={[s.floatText, { color: '#713F12' }]}>English</Text>
              </View>
            </View>

            {/* Text */}
            <View style={s.textBlock}>
              <Text style={[s.stepTitle, { color: '#0D1F1C', fontFamily: Fonts?.rounded }]}>
                Choose your language
              </Text>
              <Text style={[s.stepSub, { color: '#4A6B63' }]}>
                Apomuden will respond in the language you choose
              </Text>
            </View>

            {/* Language cards */}
            <View style={[s.langRow, { marginTop: Spacing.two }]}>
              {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map((code) => (
                <LangCard
                  key={code}
                  code={code}
                  selected={language === code}
                  onPress={() => setLanguage(code)}
                />
              ))}
            </View>

            {/* Coming soon */}
            <View style={s.comingSoonRow}>
              <Text style={s.comingSoonLabel}>Coming soon: </Text>
              {COMING_SOON_LANGUAGES.map((l) => (
                <View key={l.code} style={s.comingSoonPill}>
                  <Text style={s.comingSoonPillText}>{l.name}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [s.cta, { backgroundColor: Brand.primary, opacity: pressed ? 0.88 : 1 }]}
              onPress={handleNext}>
              <Text style={s.ctaText}>Continue</Text>
              <Icon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow.right' }} size={18} tintColor="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {/* ── Step 1: Voice ── */}
        {step === 1 && (
          <View style={[s.page, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
            {/* Illustration */}
            <View style={[s.illustrationArea, { backgroundColor: Brand.primaryFaint, borderRadius: Radius.xl }]}>
              <LottieView
                source={require('@/assets/lottie/voice-idle.json')}
                autoPlay loop
                style={s.lottie}
              />
            </View>

            {/* Text */}
            <View style={s.textBlock}>
              <Text style={[s.stepTitle, { color: '#0D1F1C', fontFamily: Fonts?.rounded }]}>
                Speak with Apomuden
              </Text>
              <Text style={[s.stepSub, { color: '#4A6B63' }]}>
                Ask health questions by voice — in {language === 'tw' ? 'Twi' : 'English'}
              </Text>
            </View>

            {/* Feature bullets */}
            <View style={s.bullets}>
              <FeatureBullet
                icon={{ ios: 'mic.fill', android: 'mic', web: 'mic.fill' }}
                title="Voice in Twi"
                sub="Speak naturally and Apomuden understands you"
                delay={0}
              />
              <FeatureBullet
                icon={{ ios: 'translate', android: 'translate', web: 'translate' }}
                title="Real-time translation"
                sub="Your words are translated and answered instantly"
                delay={80}
              />
              <FeatureBullet
                icon={{ ios: 'lock.shield.fill', android: 'security', web: 'lock.shield.fill' }}
                title="Private & secure"
                sub="Audio is processed in real time and never stored"
                delay={160}
              />
            </View>

            {micGranted && (
              <View style={s.micGranted}>
                <Icon name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'checkmark.circle.fill' }} size={18} tintColor={Brand.primary} />
                <Text style={[s.micGrantedText, { color: Brand.primary }]}>Microphone access granted</Text>
              </View>
            )}

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [s.cta, { backgroundColor: Brand.primary, opacity: pressed ? 0.88 : 1 }]}
              onPress={handleNext}>
              <Text style={s.ctaText}>{micGranted ? 'Continue' : 'Allow Microphone'}</Text>
              <Icon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow.right' }} size={18} tintColor="#FFFFFF" />
            </Pressable>

            {!micGranted && (
              <Pressable onPress={() => goTo(2)} style={s.skipLink}>
                <Text style={s.skipText}>Skip for now</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Step 2: Ready ── */}
        {step === 2 && (
          <View style={[s.page, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 }]}>
            {/* Illustration */}
            <View style={[s.illustrationArea, { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.xl }]}>
              <LottieView
                source={require('@/assets/lottie/health-pulse.json')}
                autoPlay loop
                style={s.lottie}
              />
            </View>

            {/* Text */}
            <View style={s.textBlock}>
              <Text style={[s.stepTitle, { color: '#FFFFFF', fontFamily: Fonts?.rounded }]}>
                {language === 'tw' ? `Akwaaba, ${userName}!` : `Welcome, ${userName}!`}
              </Text>
              <Text style={[s.stepSub, { color: 'rgba(255,255,255,0.8)' }]}>
                Your personal health companion is ready
              </Text>
            </View>

            {/* What you can do */}
            <View style={s.readyCards}>
              {[
                { icon: { ios: 'mic.fill',           android: 'mic',              web: 'mic.fill' },            label: 'Ask by voice in Twi' },
                { icon: { ios: 'bubble.left.fill',   android: 'chat',             web: 'bubble.left.fill' },    label: 'Chat in any language' },
                { icon: { ios: 'newspaper.fill',     android: 'article',          web: 'newspaper.fill' },      label: 'Daily health news' },
                { icon: { ios: 'book.fill',          android: 'menu_book',        web: 'book.fill' },           label: 'Browse health topics' },
              ].map((item) => (
                <View key={item.label} style={s.readyCard}>
                  <View style={[s.readyCardIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Icon name={item.icon} size={20} tintColor="#FFFFFF" />
                  </View>
                  <Text style={s.readyCardLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <Pressable
              style={({ pressed }) => [
                s.cta,
                { backgroundColor: '#FFFFFF', opacity: saving || pressed ? 0.85 : 1 },
              ]}
              onPress={handleNext}
              disabled={saving}>
              <Text style={[s.ctaText, { color: Brand.primary }]}>
                {saving ? 'Setting up…' : 'Open Apomuden'}
              </Text>
              {!saving && (
                <Icon name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow.right' }} size={18} tintColor={Brand.primary} />
              )}
            </Pressable>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1 },
  dotsWrap: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    alignItems: 'center',
  },
  content: { flex: 1 },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    justifyContent: 'space-between',
  },

  // Illustration
  illustrationArea: {
    alignSelf: 'center',
    width:  W - Spacing.four * 2,
    height: H * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  lottie: { width: H * 0.22, height: H * 0.22 },

  // Floating pills (step 0)
  floatPill: {
    position: 'absolute',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
  },
  floatLeft:  { left: 0,  bottom: 12, transform: [{ rotate: '-6deg' }] },
  floatRight: { right: 0, top: 16,    transform: [{ rotate: '5deg'  }] },
  floatText:  { fontSize: 13, fontWeight: '700' },

  // Text block
  textBlock: { gap: 6 },
  stepTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  stepSub:   { fontSize: 15, lineHeight: 22 },

  // Language row (step 0)
  langRow: { flexDirection: 'row', gap: Spacing.three },

  // Coming soon (step 0)
  comingSoonRow:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  comingSoonLabel:   { fontSize: 12, color: '#7A9990' },
  comingSoonPill:    { backgroundColor: '#F4F9F7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  comingSoonPillText:{ fontSize: 12, color: '#7A9990', fontWeight: '500' },

  // Bullets (step 1)
  bullets: { gap: Spacing.two },

  // Mic granted
  micGranted: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Brand.primaryFaint,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, alignSelf: 'flex-start',
  },
  micGrantedText: { fontSize: 13, fontWeight: '600' },

  // Skip
  skipLink: { alignItems: 'center', paddingVertical: 4 },
  skipText: { fontSize: 13, color: '#7A9990' },

  // Ready cards (step 2)
  readyCards: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.two,
  },
  readyCard: {
    width: (W - Spacing.four * 2 - Spacing.two) / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  readyCardIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  readyCardLabel: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', lineHeight: 18 },

  // CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 17, borderRadius: Radius.full,
  },
  ctaText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});

const lc = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 2,
    borderColor: '#D0E8D8',
    backgroundColor: '#F7FAF8',
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  name:   { fontSize: 17, fontWeight: '700', color: '#0D1F1C' },
  native: { fontSize: 13 },
  check: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
});

const fb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconWrap: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#0D1F1C', marginBottom: 2 },
  sub:   { fontSize: 13, color: '#4A6B63', lineHeight: 18 },
});

const dot = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
