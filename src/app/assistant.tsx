/**
 * Apomuden Assistant — Voice & Chat
 */
import { Icon } from '@/components/icon';
import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  InteractionManager, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import Animated, {
  cancelAnimation, interpolate,
  useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getKhayaConfig } from '@/constants/khaya';
import { Brand, Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { askHealthQuestion, type SupportedLanguage } from '@/lib/claude-health';
import { transcribeWithKhaya } from '@/lib/khayaTranscribe';
import { khayaTranslate } from '@/lib/khayaTranslate';
import { khayaSynthesizeToCacheFile, playLocalAudioAndWait } from '@/lib/khayaTts';
import { getPref } from '@/lib/storage';
import { saveInteraction, supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type Mode  = 'voice' | 'chat';
type Phase = 'idle' | 'recording' | 'transcribing' | 'translating-in'
           | 'thinking' | 'translating-out' | 'speaking';

interface Message { id: string; role: 'user' | 'aura'; text: string }
interface VoiceResult { user: string; aura: string; isError?: boolean }

const ORB = 100;

const KHAYA_RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function phaseLabel(p: Phase, lang: SupportedLanguage): string {
  if (lang === 'tw') {
    switch (p) {
      case 'recording':       return 'Mete wo nsem…';
      case 'transcribing':    return 'Mepɔ wo nsem…';
      case 'translating-in':  return 'Metranslate…';
      case 'thinking':        return 'Medwen…';
      case 'translating-out': return 'Meprepare…';
      case 'speaking':        return 'Meka…';
      default:                return 'Taps mic na ka';
    }
  }
  switch (p) {
    case 'recording':       return 'Listening…';
    case 'transcribing':    return 'Processing…';
    case 'translating-in':  return 'Translating…';
    case 'thinking':        return 'Thinking…';
    case 'translating-out': return 'Preparing…';
    case 'speaking':        return 'Speaking…';
    default:                return 'Tap the mic to speak';
  }
}

function orbColor(p: Phase): string {
  switch (p) {
    case 'recording':                                       return '#EF4444';
    case 'transcribing': case 'translating-in':
    case 'thinking':     case 'translating-out':           return '#7C3AED';
    case 'speaking':                                       return Brand.primary;
    default:                                               return Brand.primary;
  }
}

// ─── Animations ───────────────────────────────────────────────────────────────
function Ring({ delay, active, color }: { delay: number; active: boolean; color: string }) {
  const sc = useSharedValue(1);
  const op = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(sc); cancelAnimation(op);
    if (active) {
      sc.value = withDelay(delay, withRepeat(withSequence(
        withTiming(1, { duration: 0 }), withTiming(2.6, { duration: 1500 })), -1, false));
      op.value = withDelay(delay, withRepeat(withSequence(
        withTiming(0.45, { duration: 0 }), withTiming(0, { duration: 1500 })), -1, false));
    } else {
      sc.value = withTiming(1, { duration: 400 });
      op.value = withTiming(0, { duration: 400 });
    }
  }, [active, delay, sc, op]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: sc.value }], opacity: op.value,
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: 'absolute', width: ORB, height: ORB,
      borderRadius: ORB / 2, borderWidth: 1.5, borderColor: color,
    }, style]} />
  );
}

function SpinArc({ active }: { active: boolean }) {
  const r = useSharedValue(0);
  const o = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(r); cancelAnimation(o);
    if (active) {
      o.value = withTiming(1, { duration: 250 });
      r.value = withRepeat(withTiming(360, { duration: 900 }), -1, false);
    } else {
      o.value = withTiming(0, { duration: 250 });
    }
  }, [active, r, o]);
  const sz = ORB + 26;
  const style = useAnimatedStyle(() => ({
    opacity: o.value, transform: [{ rotate: `${r.value}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{
      position: 'absolute', width: sz, height: sz, borderRadius: sz / 2,
      borderWidth: 2.5, borderColor: '#7C3AED',
      borderTopColor: 'transparent', borderRightColor: 'transparent',
    }, style]} />
  );
}

function VoiceOrb({ phase }: { phase: Phase }) {
  const sc  = useSharedValue(1);
  const color = orbColor(phase);
  const isRec      = phase === 'recording';
  const isProc     = ['transcribing', 'translating-in', 'thinking', 'translating-out'].includes(phase);
  const isSpeaking = phase === 'speaking';
  const wave = isRec || isSpeaking;
  useEffect(() => {
    cancelAnimation(sc);
    if (isRec)
      sc.value = withRepeat(withSequence(withTiming(1.12, { duration: 480 }), withTiming(0.94, { duration: 480 })), -1, false);
    else if (isSpeaking)
      sc.value = withRepeat(withSequence(withTiming(1.07, { duration: 340 }), withTiming(0.97, { duration: 340 })), -1, false);
    else
      sc.value = withRepeat(withSequence(withTiming(1.03, { duration: 2200 }), withTiming(1.0, { duration: 2200 })), -1, false);
  }, [phase, isRec, isSpeaking, sc]);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return (
    <View style={{ width: ORB * 2.4, height: ORB * 2.4, alignItems: 'center', justifyContent: 'center' }}>
      <Ring delay={0}   active={wave} color={color} />
      <Ring delay={400} active={wave} color={color} />
      <Ring delay={800} active={wave} color={color} />
      <SpinArc active={isProc} />
      <Animated.View style={[{ width: ORB, height: ORB, borderRadius: ORB / 2, backgroundColor: color }, orbStyle]} />
    </View>
  );
}

// ─── Chat bubbles ─────────────────────────────────────────────────────────────
const Bubble = React.memo(function Bubble({ msg, colors }: { msg: Message; colors: typeof Colors.light }) {
  const isUser = msg.role === 'user';
  const enter  = useSharedValue(0);
  useEffect(() => { enter.value = withSpring(1, { damping: 16, stiffness: 180 }); }, [enter]);
  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [10, 0]) }],
  }));
  return (
    <Animated.View style={[cb.row, isUser ? cb.rowUser : cb.rowAura, style]}>
      {!isUser && (
        <View style={[cb.avatar, { backgroundColor: Brand.primaryFaint }]}>
          <Text style={[cb.avatarLetter, { color: Brand.primary }]}>A</Text>
        </View>
      )}
      <View style={[cb.bubble,
        isUser
          ? { backgroundColor: Brand.primary }
          : { backgroundColor: colors.backgroundCard, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
      ]}>
        <Text style={[cb.text, { color: isUser ? '#FFFFFF' : colors.text }]}>{msg.text}</Text>
      </View>
    </Animated.View>
  );
});

function Dot({ delay, color }: { delay: number; color: string }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withSequence(
      withTiming(-6, { duration: 280 }), withTiming(0, { duration: 280 })), -1, false));
  }, [delay, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, style]} />;
}

function TypingDots({ colors }: { colors: typeof Colors.light }) {
  return (
    <View style={[cb.row, cb.rowAura]}>
      <View style={[cb.avatar, { backgroundColor: Brand.primaryFaint }]}>
        <Text style={[cb.avatarLetter, { color: Brand.primary }]}>A</Text>
      </View>
      <View style={[cb.bubble, {
        backgroundColor: colors.backgroundCard,
        borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
        flexDirection: 'row', gap: 5, paddingVertical: 14,
      }]}>
        <Dot delay={0}   color={colors.textTertiary} />
        <Dot delay={160} color={colors.textTertiary} />
        <Dot delay={320} color={colors.textTertiary} />
      </View>
    </View>
  );
}

// ─── Mode pill ────────────────────────────────────────────────────────────────
function ModePill({ mode, onChange, colors }: {
  mode: Mode; onChange: (m: Mode) => void; colors: typeof Colors.light;
}) {
  const slide = useSharedValue(mode === 'voice' ? 0 : 1);
  useEffect(() => {
    slide.value = withSpring(mode === 'voice' ? 0 : 1, { damping: 18, stiffness: 200 });
  }, [mode, slide]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(slide.value, [0, 1], [2, 82]) }],
  }));
  return (
    <View style={[mp.pill, { backgroundColor: colors.backgroundElement }]}>
      <Animated.View style={[mp.knob, { backgroundColor: colors.backgroundCard }, knob]} />
      {(['voice', 'chat'] as Mode[]).map((m) => (
        <Pressable key={m} style={mp.option} onPress={() => onChange(m)}>
          <Icon
            name={m === 'voice'
              ? { ios: 'mic.fill', android: 'mic', web: 'mic.fill' }
              : { ios: 'bubble.left.fill', android: 'chat', web: 'bubble.left.fill' }}
            size={13} tintColor={mode === m ? Brand.primary : colors.textTertiary}
          />
          <Text style={[mp.label, { color: mode === m ? Brand.primary : colors.textTertiary }]}>
            {m === 'voice' ? 'Voice' : 'Chat'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AssistantScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  // Tab bar is ~49pt tall; mic needs to clear it + a comfortable gap
  const TAB_BAR = 49;
  const micBottomPad = insets.bottom + TAB_BAR + Spacing.three + 50;

  const [mode, setMode]     = useState<Mode>('voice');
  const [lang, setLang]     = useState<SupportedLanguage>('tw');
  const [phase, setPhase]   = useState<Phase>('idle');
  const [messages, setMsgs] = useState<Message[]>([]);
  const [input, setInput]   = useState('');
  const [khayaOk, setKhayaOk] = useState(false);
  const [isTyping, setTyping] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null);

  const recRef    = useRef<InstanceType<typeof Audio.Recording> | null>(null);
  const listRef   = useRef<FlatList>(null);
  const lottieRef = useRef<LottieView>(null);
  const inputRef  = useRef<TextInput>(null);
  const userIdRef = useRef<string | null>(null);

  const voiceBusy  = phase !== 'idle';
  const isRec      = phase === 'recording';
  const isIdle     = phase === 'idle';
  const onSimulator = Platform.OS === 'ios' && !Device.isDevice;
  // Khaya ASR only supports Twi — voice mode only works in Twi
  const canVoice   = khayaOk && Platform.OS !== 'web' && !onSimulator && lang === 'tw';

  useEffect(() => {
    setKhayaOk(!!getKhayaConfig());
    getPref<SupportedLanguage>('language', 'tw').then(setLang);
    supabase.auth.getSession().then(({ data: { session } }) => {
      userIdRef.current = session?.user.id ?? null;
    });
  }, []);

  const focusInput = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
  }, []);

  const addMsg = useCallback((role: Message['role'], text: string) => {
    const msg: Message = { id: `${Date.now()}-${Math.random()}`, role, text };
    setMsgs((prev) => [...prev, msg]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  // ─── Chat pipeline ───────────────────────────────────────────────────────
  const handleChatSubmit = useCallback(async () => {
    const q = input.trim();
    if (!q || isTyping) return;
    setInput('');
    addMsg('user', q);
    setTyping(true);
    try {
      const cfg = getKhayaConfig();
      let englishQ = q;
      if (lang === 'tw' && cfg) {
        englishQ = await khayaTranslate(q, 'tw-en', cfg);
      }
      const englishAnswer = await askHealthQuestion(englishQ);
      let finalAnswer = englishAnswer;
      if (lang === 'tw' && cfg) {
        finalAnswer = await khayaTranslate(englishAnswer, 'en-tw', cfg);
      }
      addMsg('aura', finalAnswer);
      if (userIdRef.current) {
        void saveInteraction({
          user_id: userIdRef.current, language: lang,
          user_msg: q, aura_msg: finalAnswer, source: 'chat',
        });
      }
    } catch (e) {
      addMsg('aura', e instanceof Error ? e.message : String(e));
    } finally {
      setTyping(false);
    }
  }, [input, isTyping, lang, addMsg]);

  // ─── Voice pipeline ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (voiceBusy) return;
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setVoiceResult({ user: '', aura: 'Microphone permission denied. Please allow access in Settings.', isError: true });
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(KHAYA_RECORDING_OPTIONS);
      recRef.current = recording;
      setPhase('recording');
    } catch (e) {
      setVoiceResult({ user: '', aura: `Could not start recording: ${e instanceof Error ? e.message : String(e)}`, isError: true });
    }
  }, [voiceBusy]);

  const stopAndRun = useCallback(async () => {
    const rec = recRef.current;
    if (!rec) return;
    recRef.current = null;
    const cfg = getKhayaConfig();
    if (!cfg) {
      setPhase('idle');
      setVoiceResult({ user: '', aura: 'Khaya credentials missing — check ai.txt.', isError: true });
      return;
    }
    let transcribed = '';
    try {
      setPhase('transcribing');
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) throw new Error('No recording URI — try again.');

      transcribed = (await transcribeWithKhaya(uri, cfg)).trim();
      if (!transcribed) throw new Error('No speech detected — please speak clearly and try again.');
      addMsg('user', transcribed);

      let englishQ = transcribed;
      if (lang === 'tw') {
        setPhase('translating-in');
        englishQ = await khayaTranslate(transcribed, 'tw-en', cfg);
      }

      setPhase('thinking');
      const englishAnswer = await askHealthQuestion(englishQ);

      if (lang === 'tw') {
        setPhase('translating-out');
        const twAnswer = await khayaTranslate(englishAnswer, 'en-tw', cfg);
        addMsg('aura', twAnswer);
        setVoiceResult({ user: transcribed, aura: twAnswer });
        if (userIdRef.current) {
          void saveInteraction({
            user_id: userIdRef.current, language: 'tw',
            user_msg: transcribed, aura_msg: twAnswer, source: 'voice',
          });
        }
        setPhase('speaking');
        const audioPath = await khayaSynthesizeToCacheFile(twAnswer, 'tw', cfg);
        try {
          await playLocalAudioAndWait(audioPath);
        } finally {
          void FileSystem.deleteAsync(audioPath, { idempotent: true });
        }
      } else {
        addMsg('aura', englishAnswer);
        setVoiceResult({ user: transcribed, aura: englishAnswer });
        if (userIdRef.current) {
          void saveInteraction({
            user_id: userIdRef.current, language: 'en',
            user_msg: transcribed, aura_msg: englishAnswer, source: 'voice',
          });
        }
        setPhase('speaking');
        await new Promise<void>((r) => setTimeout(r, 600));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addMsg('aura', msg);
      setVoiceResult({ user: transcribed, aura: msg, isError: true });
    } finally {
      setPhase('idle');
    }
  }, [lang, addMsg]);

  const handleMicPress = useCallback(() => {
    if (isRec) void stopAndRun();
    else if (isIdle) void startRecording();
  }, [isRec, isIdle, stopAndRun, startRecording]);

  useEffect(() => () => { recRef.current?.stopAndUnloadAsync(); }, []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView edges={['top']} style={s.safeTop}>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text, fontFamily: Fonts?.rounded }]}>Apomuden</Text>
          <ModePill mode={mode} onChange={setMode} colors={colors} />
          <View style={[s.langPill, { backgroundColor: colors.backgroundElement }]}>
            {(['tw', 'en'] as SupportedLanguage[]).map((code) => (
              <Pressable key={code}
                style={[s.langBtn, lang === code && { backgroundColor: Brand.primary }]}
                onPress={() => setLang(code)}>
                <Text style={[s.langTxt, { color: lang === code ? '#FFFFFF' : colors.textSecondary }]}>
                  {code === 'tw' ? 'Twi' : 'EN'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {/* ── Voice mode ── */}
      {mode === 'voice' && (
        <View style={s.voicePage}>
          {/* Orb */}
          <View style={s.orbArea}>
            {isIdle ? (
              <LottieView ref={lottieRef}
                source={require('@/assets/lottie/voice-idle.json')}
                autoPlay loop
                style={{ width: ORB * 2.4, height: ORB * 2.4 }} />
            ) : (
              <VoiceOrb phase={phase} />
            )}
            <Text style={[s.phaseLabel, { color: colors.textSecondary }]}>
              {phaseLabel(phase, lang)}
            </Text>
          </View>

          {/* Result card — only when idle and a result exists */}
          {isIdle && voiceResult && (
            <ScrollView
              style={[s.resultScroll, {
                backgroundColor: colors.backgroundCard,
                borderColor: voiceResult.isError ? '#EF4444' : colors.border,
              }]}
              contentContainerStyle={s.resultBody}
              showsVerticalScrollIndicator={false}>
              {!!voiceResult.user && (
                <Text style={[s.resultUser, { color: colors.textSecondary }]}>
                  "{voiceResult.user}"
                </Text>
              )}
              <Text style={[s.resultAura, {
                color: voiceResult.isError ? '#EF4444' : colors.text,
              }]}>
                {voiceResult.aura}
              </Text>
            </ScrollView>
          )}

          {/* Mic button */}
          <View style={[s.micArea, { paddingBottom: micBottomPad }]}>
            <Pressable
              style={[
                s.micBtn,
                isRec     && { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
                !canVoice && { backgroundColor: colors.backgroundElement, shadowOpacity: 0 },
              ]}
              onPress={canVoice ? handleMicPress : undefined}
              disabled={!canVoice || (voiceBusy && !isRec)}>
              <Icon
                name={isRec
                  ? { ios: 'stop.fill', android: 'stop', web: 'stop.fill' }
                  : { ios: 'mic.fill', android: 'mic', web: 'mic.fill' }}
                size={30}
                tintColor={canVoice ? '#FFFFFF' : colors.textTertiary}
              />
            </Pressable>

            {onSimulator && (
              <Text style={[s.hint, { color: colors.textTertiary }]}>
                Mic unavailable on Simulator
              </Text>
            )}
            {!canVoice && !onSimulator && lang !== 'tw' && (
              <Text style={[s.hint, { color: colors.textTertiary }]}>
                Voice works in Twi only — use Chat for English
              </Text>
            )}
            {!canVoice && !onSimulator && lang === 'tw' && (
              <Text style={[s.hint, { color: colors.textTertiary }]}>
                Add Khaya API key to ai.txt and restart
              </Text>
            )}
          </View>
        </View>
      )}

      {/* ── Chat mode ── */}
      {mode === 'chat' && (
        <View style={s.chatPage}>
          {messages.length === 0 && !isTyping ? (
            <View style={s.emptyChat}>
              <View style={[s.emptyIcon, { backgroundColor: Brand.primaryFaint }]}>
                <Icon name={{ ios: 'bubble.left.fill', android: 'chat', web: 'bubble.left.fill' }}
                  size={26} tintColor={Brand.primary} />
              </View>
              <Text style={[s.emptyTitle, { color: colors.text, fontFamily: Fonts?.rounded }]}>
                Ask Apomuden anything
              </Text>
              <Text style={[s.emptySub, { color: colors.textSecondary }]}>
                {lang === 'tw' ? 'Ka asem bi ma me…' : 'Type a health question below'}
              </Text>
              <Pressable
                style={[s.typeBtn, { backgroundColor: Brand.primary }]}
                onPress={focusInput}>
                <Icon name={{ ios: 'keyboard', android: 'keyboard', web: 'keyboard' }} size={16} tintColor="#FFFFFF" />
                <Text style={s.typeBtnText}>Type</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={s.chatList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => <Bubble msg={item} colors={colors} />}
              ListFooterComponent={isTyping ? <TypingDots colors={colors} /> : null}
            />
          )}
          {/* Type button row — shown after receiving a response when input is empty */}
          {messages.length > 0 && !input.trim() && !isTyping && (
            <View style={[s.typeBtnRow, { backgroundColor: colors.background }]}>
              <Pressable style={[s.typeBtn, { backgroundColor: Brand.primary }]} onPress={focusInput}>
                <Icon name={{ ios: 'keyboard', android: 'keyboard', web: 'keyboard' }} size={16} tintColor="#FFFFFF" />
                <Text style={s.typeBtnText}>Type</Text>
              </Pressable>
            </View>
          )}
          <View style={[s.inputBar, {
            paddingBottom: messages.length === 0 && !isTyping
              ? Math.max(insets.bottom + TAB_BAR + Spacing.one - 70, insets.bottom + 8)
              : 0,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          }]}>
            <TextInput
              ref={inputRef}
              style={[s.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder={lang === 'tw' ? 'Ka asem bi ma me…' : 'Ask a health question…'}
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              returnKeyType="send"
              onSubmitEditing={handleChatSubmit}
              editable={!isTyping}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[s.sendBtn, {
                backgroundColor: input.trim() && !isTyping ? Brand.primary : colors.backgroundElement,
              }]}
              onPress={handleChatSubmit}
              disabled={!input.trim() || isTyping}>
              <Icon name={{ ios: 'arrow.up', android: 'arrow-upward', web: 'arrow.up' }}
                size={18}
                tintColor={input.trim() && !isTyping ? '#FFFFFF' : colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}


const s = StyleSheet.create({
  root:    { flex: 1 },
  safeTop: {},
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, gap: Spacing.two,
  },
  title:   { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  langPill: { flexDirection: 'row', borderRadius: Radius.full, padding: 3, gap: 2 },
  langBtn:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  langTxt:  { fontSize: 12, fontWeight: '600' },

  // Voice
  voicePage: { flex: 1 },
  orbArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  phaseLabel: { fontSize: 15, fontWeight: '500', textAlign: 'center', paddingHorizontal: Spacing.four },
  resultScroll: { maxHeight: 180, marginHorizontal: Spacing.four, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  resultBody: { padding: Spacing.three, gap: Spacing.two },
  resultUser: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  resultAura: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  micArea: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.three },
  micBtn: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Brand.primary,
    shadowColor: Brand.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  hint: { fontSize: 12, textAlign: 'center', paddingHorizontal: Spacing.four },

  // Chat
  chatPage: { flex: 1 },
  chatList: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.two },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five },
  emptyIcon:  { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: -0.3 },
  emptySub:   { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 22, paddingVertical: 12, borderRadius: Radius.full, marginTop: 4 },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  typeBtnRow: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'flex-start' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: Spacing.two, paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  keyboardBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

const mp = StyleSheet.create({
  pill: {
    flexDirection: 'row', borderRadius: Radius.full,
    padding: 2, width: 164, height: 36, position: 'relative',
  },
  knob: {
    position: 'absolute', top: 2, width: 80, height: 32,
    borderRadius: Radius.full,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  option: {
    width: 80, height: 32, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 5, zIndex: 1,
  },
  label: { fontSize: 12, fontWeight: '600' },
});

const cb = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.two, gap: Spacing.two },
  rowUser:     { justifyContent: 'flex-end' },
  rowAura:     { justifyContent: 'flex-start' },
  avatar:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarLetter:{ fontSize: 13, fontWeight: '700' },
  bubble:      { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  text:        { fontSize: 15, lineHeight: 22 },
});
