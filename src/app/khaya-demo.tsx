import { Audio } from 'expo-av';
import * as Device from 'expo-device';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListeningParticles } from '@/components/listening-particles';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getKhayaConfig } from '@/constants/khaya';
import { claudeAnswerEnglishMinimal } from '@/lib/claude';
import { khayaSynthesizeToCacheFile, playLocalAudioAndWait } from '@/lib/khayaTts';
import { khayaTranslate } from '@/lib/khayaTranslate';
import { transcribeWithKhaya } from '@/lib/khayaTranscribe';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

type Phase = 'idle' | 'asr' | 'to-en' | 'claude' | 'to-tw' | 'tts' | 'done';

function phaseLabel(phase: Exclude<Phase, 'idle' | 'done'>): string {
  switch (phase) {
    case 'asr':
      return 'Transcribing speech…';
    case 'to-en':
      return 'Translating to English…';
    case 'claude':
      return 'Claude is answering…';
    case 'to-tw':
      return 'Translating answer to Twi…';
    case 'tts':
      return 'Speaking in Twi…';
    default:
      return 'Tap below to speak';
  }
}

export default function KhayaDemoScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const accentColor = isDark ? '#34D399' : '#10A37F';
  const secondaryParticleColor = isDark ? 'rgba(167, 243, 208, 0.85)' : 'rgba(16, 185, 129, 0.75)';

  const [configOk, setConfigOk] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rawTranscript, setRawTranscript] = useState<string | null>(null);
  const [englishQuestion, setEnglishQuestion] = useState<string | null>(null);
  const [claudeEnglish, setClaudeEnglish] = useState<string | null>(null);
  const [twiAnswer, setTwiAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<InstanceType<typeof Audio.Recording> | null>(null);

  const busy = phase !== 'idle' && phase !== 'done';

  useEffect(() => {
    setConfigOk(!!getKhayaConfig());
  }, []);

  const resetOutput = useCallback(() => {
    setRawTranscript(null);
    setEnglishQuestion(null);
    setClaudeEnglish(null);
    setTwiAnswer(null);
    setError(null);
    setPhase('idle');
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Recording is not supported on web in this demo. Use the iOS or Android app.');
      return;
    }

    resetOutput();
    const cfg = getKhayaConfig();
    if (!cfg) {
      setError('Missing Khaya credentials. Add ai.txt (and related files) at the project root and restart Expo.');
      return;
    }

    const perm = await Audio.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      setError('Microphone permission is required to record.');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(`Could not start recording: ${message}`);
    }
  }, [resetOutput]);

  const stopAndRunPipeline = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) {
      return;
    }

    setIsRecording(false);
    recordingRef.current = null;

    const cfg = getKhayaConfig();
    if (!cfg) {
      setError('Missing Khaya credentials. Add ai.txt at the project root and restart Expo.');
      return;
    }

    setError(null);
    setRawTranscript(null);
    setEnglishQuestion(null);
    setClaudeEnglish(null);
    setTwiAnswer(null);

    try {
      setPhase('asr');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) {
        throw new Error('No recording file URI returned.');
      }

      const raw = await transcribeWithKhaya(uri, cfg);
      const trimmed = raw.trim();
      if (!trimmed) {
        throw new Error('No speech detected. Try again.');
      }
      setRawTranscript(trimmed);

      setPhase('to-en');
      const en = await khayaTranslate(trimmed, 'tw-en', cfg);
      setEnglishQuestion(en);

      setPhase('claude');
      const answer = await claudeAnswerEnglishMinimal(en);
      setClaudeEnglish(answer);

      setPhase('to-tw');
      const tw = await khayaTranslate(answer, 'en-tw', cfg);
      setTwiAnswer(tw);

      setPhase('tts');
      const audioPath = await khayaSynthesizeToCacheFile(tw, 'tw', cfg);
      await playLocalAudioAndWait(audioPath);

      setPhase('done');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setPhase('idle');
    }
  }, []);

  useEffect(() => {
    return () => {
      const r = recordingRef.current;
      if (r) {
        void r.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    };
  }, []);

  const khaya = getKhayaConfig();
  const maskedKey =
    khaya && khaya.subscriptionKey.length > 8
      ? `${khaya.subscriptionKey.slice(0, 4)}…${khaya.subscriptionKey.slice(-4)}`
      : khaya?.subscriptionKey
        ? '(set)'
        : '(missing)';

  const particlesActive = isRecording || busy;
  const particlesMode = isRecording ? 'listening' : busy ? 'processing' : 'listening';

  const statusLabel = (() => {
    if (isRecording) return 'Listening…';
    if (phase !== 'idle' && phase !== 'done') {
      return phaseLabel(phase);
    }
    if (phase === 'done') {
      return 'Done — tap to ask again';
    }
    return 'Tap below to speak';
  })();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ThemedView style={styles.inner}>
            <ThemedText type="subtitle">Khaya voice assistant</ThemedText>
            <ThemedText style={styles.blurb} themeColor="textSecondary">
              Twi speech → English → Claude → Twi answer → Khaya TTS. API refs:{' '}
              <ThemedText type="code">ai.txt</ThemedText>,{' '}
              <ThemedText type="code">translation.txt</ThemedText>,{' '}
              <ThemedText type="code">text-to-speech.txt</ThemedText>. Claude:{' '}
              <ThemedText type="code">EXPO_PUBLIC_API_KEY</ThemedText> in{' '}
              <ThemedText type="code">.env.local</ThemedText>.
            </ThemedText>

            <ThemedView
              type="backgroundElement"
              style={[styles.orbSection, { borderColor: theme.backgroundSelected }]}>
              <ListeningParticles
                active={particlesActive}
                mode={particlesMode}
                accentColor={accentColor}
                secondaryColor={secondaryParticleColor}
              />
              <ThemedText
                type="smallBold"
                style={styles.statusText}
                themeColor={particlesActive || phase === 'done' ? 'text' : 'textSecondary'}>
                {statusLabel}
              </ThemedText>
            </ThemedView>

            {Platform.OS === 'web' ? (
              <ThemedText type="small" themeColor="textSecondary">
                Open on iOS or Android in Expo Go to run the full pipeline (Claude + TTS need the native
                app).
              </ThemedText>
            ) : (
              <View style={styles.controls}>
                {!isRecording ? (
                  <Pressable
                    onPress={startRecording}
                    disabled={busy}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      {
                        backgroundColor: accentColor,
                        opacity: pressed ? 0.92 : busy ? 0.45 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
                      {busy ? 'Working…' : 'Tap to speak'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={stopAndRunPipeline}
                    style={({ pressed }) => [
                      styles.stopButton,
                      {
                        backgroundColor: theme.backgroundSelected,
                        borderColor: accentColor,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: accentColor }}>
                      Stop &amp; run pipeline
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            )}

            <ThemedView type="backgroundElement" style={styles.configBox}>
              <ThemedText type="smallBold">Khaya endpoints</ThemedText>
              <ThemedText type="small" selectable themeColor="textSecondary" numberOfLines={3}>
                ASR · TTS · translate · key {maskedKey}
              </ThemedText>
              {configOk === false && (
                <ThemedText type="small" themeColor="textSecondary">
                  Restart Expo after editing reference files.
                </ThemedText>
              )}
            </ThemedView>

            {rawTranscript && (
              <ThemedView type="backgroundElement" style={styles.resultBox}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Transcript (Twi)
                </ThemedText>
                <ThemedText type="small" selectable>
                  {rawTranscript}
                </ThemedText>
              </ThemedView>
            )}

            {englishQuestion && (
              <ThemedView type="backgroundElement" style={styles.resultBox}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  English (Khaya translate)
                </ThemedText>
                <ThemedText type="small" selectable>
                  {englishQuestion}
                </ThemedText>
              </ThemedView>
            )}

            {claudeEnglish && (
              <ThemedView type="backgroundElement" style={styles.resultBox}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Claude (English)
                </ThemedText>
                <ThemedText type="small" selectable>
                  {claudeEnglish}
                </ThemedText>
              </ThemedView>
            )}

            {twiAnswer && (
              <ThemedView type="backgroundElement" style={styles.resultBox}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Answer (Twi) · spoken via Khaya TTS
                </ThemedText>
                <ThemedText type="small" selectable>
                  {twiAnswer}
                </ThemedText>
              </ThemedView>
            )}

            {error && (
              <ThemedView type="backgroundElement" style={styles.resultBox}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Error
                </ThemedText>
                <ThemedText type="small" selectable>
                  {error}
                </ThemedText>
              </ThemedView>
            )}

            {Platform.OS === 'ios' && !Device.isDevice && (
              <ThemedText type="small" themeColor="textSecondary">
                The iOS Simulator cannot use the microphone; use a device to test recording.
              </ThemedText>
            )}
          </ThemedView>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  safe: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  inner: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    paddingTop: Spacing.four,
  },
  blurb: {
    lineHeight: 22,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 220,
  },
  statusText: {
    marginTop: Spacing.two,
    letterSpacing: 0.3,
  },
  controls: {
    gap: Spacing.two,
  },
  primaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: '#ffffff',
  },
  stopButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  configBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  resultBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
