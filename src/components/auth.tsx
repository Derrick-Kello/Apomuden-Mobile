import { Icon } from '@/components/icon';
import { Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { setPref } from '@/lib/storage';
import LottieView from 'lottie-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthMode = 'signin' | 'signup';

const GENDERS  = ['Male', 'Female', 'Other'] as const;
const COUNTRIES = ['Ghana', 'Nigeria', 'UK', 'USA', 'Other'] as const;
type Gender  = typeof GENDERS[number];
type Country = typeof COUNTRIES[number];

interface AuthProps {
  onAuthed: (userId: string) => void;
}

export default function Auth({ onAuthed }: AuthProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode]         = useState<AuthMode>('signin');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Sign-in fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Sign-up extra fields
  const [fullName, setFullName] = useState('');
  const [age, setAge]           = useState('');
  const [gender, setGender]     = useState<Gender | null>(null);
  const [country, setCountry]   = useState<Country | null>(null);

  const passwordRef = useRef<TextInputType>(null);
  const emailRef    = useRef<TextInputType>(null);

  const clearError = () => setError(null);

  const switchMode = (m: AuthMode) => { setMode(m); clearError(); };

  const handleSubmit = async () => {
    const trimEmail    = email.trim().toLowerCase();
    const trimPassword = password.trim();

    if (!trimEmail || !trimPassword) {
      setError('Please enter your email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      if (!age.trim() || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
        setError('Please enter a valid age.'); return;
      }
      if (!gender)  { setError('Please select your gender.');  return; }
      if (!country) { setError('Please select your country.'); return; }
    }

    setLoading(true);
    clearError();
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email: trimEmail,
          password: trimPassword,
          options: {
            data: {
              full_name: fullName.trim(),
              age:       Number(age),
              gender,
              country,
            },
          },
        });
        if (err) throw err;

        // Save name locally so the greeting works immediately
        await setPref('name', fullName.trim());

        if (data.session) {
          onAuthed(data.session.user.id);
        } else {
          // Email confirmation is ON in Supabase — switch to sign-in and show tip
          setMode('signin');
          setError('Account created! Check your email to confirm, then sign in. (Tip: disable email confirmation in Supabase → Auth → Settings for demo use.)');
        }
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: trimEmail, password: trimPassword,
        });
        if (err) throw err;
        onAuthed(data.session.user.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoCircle}>
            <LottieView
              source={require('@/assets/lottie/welcome.json')}
              autoPlay loop
              style={{ width: 72, height: 72 }}
            />
          </View>
          <Text style={[s.appName, { fontFamily: Fonts?.rounded }]}>Apomuden</Text>
          <Text style={s.tagline}>Healthcare in your language</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          {/* Mode toggle */}
          <View style={s.toggle}>
            {(['signin', 'signup'] as AuthMode[]).map((m) => (
              <Pressable
                key={m}
                style={[s.toggleBtn, mode === m && s.toggleActive]}
                onPress={() => switchMode(m)}>
                <Text style={[s.toggleText, mode === m && s.toggleTextActive]}>
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Sign-up extra fields ── */}
          {mode === 'signup' && (
            <>
              {/* Full name */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); clearError(); }}
                  placeholder="e.g. Kofi Mensah"
                  placeholderTextColor="#9AB3AB"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  editable={!loading}
                />
              </View>

              {/* Age */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Age</Text>
                <TextInput
                  style={s.input}
                  value={age}
                  onChangeText={(t) => { setAge(t.replace(/[^0-9]/g, '')); clearError(); }}
                  placeholder="e.g. 32"
                  placeholderTextColor="#9AB3AB"
                  keyboardType="number-pad"
                  returnKeyType="next"
                  maxLength={3}
                  editable={!loading}
                />
              </View>

              {/* Gender */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Gender</Text>
                <View style={s.pillRow}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g}
                      style={[s.pill, gender === g && s.pillActive]}
                      onPress={() => { setGender(g); clearError(); }}>
                      <Text style={[s.pillText, gender === g && s.pillTextActive]}>{g}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Country */}
              <View style={s.fieldGroup}>
                <Text style={s.label}>Country</Text>
                <View style={s.pillRow}>
                  {COUNTRIES.map((c) => (
                    <Pressable
                      key={c}
                      style={[s.pill, country === c && s.pillActive]}
                      onPress={() => { setCountry(c); clearError(); }}>
                      <Text style={[s.pillText, country === c && s.pillTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          )}

          {/* Email */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Email</Text>
            <TextInput
              ref={emailRef}
              style={s.input}
              value={email}
              onChangeText={(t) => { setEmail(t); clearError(); }}
              placeholder="you@example.com"
              placeholderTextColor="#9AB3AB"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={s.fieldGroup}>
            <Text style={s.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              style={s.input}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
              placeholderTextColor="#9AB3AB"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
          </View>

          {/* Error */}
          {error ? (
            <View style={s.errorBox}>
              <Icon
                name={{ ios: 'exclamationmark.circle.fill', android: 'error', web: 'exclamationmark.circle.fill' }}
                size={15} tintColor="#DC2626"
              />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [s.btn, { opacity: loading || pressed ? 0.75 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={s.btnText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </Pressable>
        </View>

        <Text style={s.footer}>
          Apomuden provides general health education — not medical diagnosis or treatment.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:  { flexGrow: 1, paddingHorizontal: Spacing.four, gap: Spacing.four },
  logoArea:{ alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Brand.primaryFaint,
  },
  appName: { fontSize: 28, fontWeight: '700', color: '#0D1F1C', letterSpacing: -0.4 },
  tagline: { fontSize: 14, color: '#4A6B63' },
  card: {
    backgroundColor: '#F7FAF8',
    borderRadius: Radius.xl,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D0E8D8',
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#E8F3EF',
    borderRadius: Radius.full,
    padding: 3,
  },
  toggleBtn:        { flex: 1, paddingVertical: 8, borderRadius: Radius.full, alignItems: 'center' },
  toggleActive:     { backgroundColor: '#FFFFFF' },
  toggleText:       { fontSize: 14, fontWeight: '600', color: '#7A9990' },
  toggleTextActive: { color: Brand.accent },
  fieldGroup: { gap: 6 },
  label:      { fontSize: 13, fontWeight: '600', color: '#4A6B63', marginLeft: 2 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D0E8D8',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#0D1F1C',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1,
    borderColor: '#D0E8D8', backgroundColor: '#FFFFFF',
  },
  pillActive:    { backgroundColor: Brand.primary, borderColor: Brand.primary },
  pillText:      { fontSize: 13, fontWeight: '600', color: '#4A6B63' },
  pillTextActive:{ color: '#FFFFFF' },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF2F2', padding: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, lineHeight: 18 },
  btn: {
    backgroundColor: Brand.accent,
    paddingVertical: 16, borderRadius: Radius.full,
    alignItems: 'center', marginTop: Spacing.one,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footer:  { textAlign: 'center', fontSize: 12, color: '#9AB3AB', paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
});
