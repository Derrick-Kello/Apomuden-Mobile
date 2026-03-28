import React, { useEffect, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';

import { BottomTabInset, Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COMING_SOON_LANGUAGES, LANGUAGE_META, type SupportedLanguage } from '@/lib/claude-health';
import { getPref, setPref } from '@/lib/storage';
import { signOut, supabase } from '@/lib/supabase';

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme = useTheme();
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState<string | null>(null);
  const [age, setAge]         = useState<number | null>(null);
  const [gender, setGender]   = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName]     = useState('');
  const [lang, setLang] = useState<SupportedLanguage>('tw');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const [n, l, { data: { session } }] = await Promise.all([
        getPref<string>('name', 'Friend'),
        getPref<SupportedLanguage>('language', 'tw'),
        supabase.auth.getSession(),
      ]);
      setName(n);
      setLang(l);
      if (session) {
        setEmail(session.user.email ?? null);
        const meta = session.user.user_metadata as Record<string, unknown> | undefined;
        if (typeof meta?.age     === 'number') setAge(meta.age);
        if (typeof meta?.gender  === 'string') setGender(meta.gender);
        if (typeof meta?.country === 'string') setCountry(meta.country);
      }
    })();
  }, []);

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (trimmed) {
      await setPref('name', trimmed);
      setName(trimmed);
    }
    setEditingName(false);
  };

  const changeLang = async (code: SupportedLanguage) => {
    setLang(code);
    await setPref('language', code);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleSignOut = async () => {
    await setPref('onboarded', false);
    await signOut();
    // _layout.tsx onAuthStateChange clears userId → Auth screen shown automatically
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Apomuden',
      'This will clear your profile and return to onboarding. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await setPref('onboarded', false);
            await setPref('name', '');
            await setPref('language', 'en');
            // The root layout checks storage on mount — user will need to restart.
            Alert.alert('Done', 'Please restart the app to complete the reset.');
          },
        },
      ],
    );
  };

  const initial = (name.trim().charAt(0) || 'A').toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BottomTabInset + 40 }}>
        <SafeAreaView edges={['top']} style={styles.safe}>

          {/* Header */}
          <Text style={[styles.pageTitle, { color: theme.text, fontFamily: Fonts?.rounded }]}>
            My Profile
          </Text>

          {/* Avatar + name */}
          <View style={[styles.avatarCard, { backgroundColor: theme.backgroundCard }]}>
            <View style={[styles.avatarCircle, { backgroundColor: Brand.accent }]}>
              <Text style={styles.avatarLetter}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}
                    value={draftName}
                    onChangeText={setDraftName}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={saveName}
                  />
                  <Pressable
                    style={[styles.saveBtn, { backgroundColor: Brand.primary }]}
                    onPress={saveName}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={[styles.profileName, { color: theme.text, fontFamily: Fonts?.rounded }]}>
                    {name}
                  </Text>
                  {email ? (
                    <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{email}</Text>
                  ) : null}
                  {(age || gender || country) ? (
                    <View style={styles.metaChips}>
                      {age    ? <View style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{age} yrs</Text></View> : null}
                      {gender ? <View style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{gender}</Text></View> : null}
                      {country ? <View style={[styles.metaChip, { backgroundColor: theme.backgroundElement }]}><Text style={[styles.metaChipText, { color: theme.textSecondary }]}>{country}</Text></View> : null}
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      setDraftName(name);
                      setEditingName(true);
                    }}>
                    <Text style={[styles.editLink, { color: Brand.primary }]}>Edit name</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {/* Language section */}
          <SectionHeader label="Language" />
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <Text style={[styles.cardLabel, { color: theme.textSecondary }]}>
              Your preferred language for Apomuden responses
            </Text>

            {(Object.keys(LANGUAGE_META) as SupportedLanguage[]).map((code, i, arr) => {
              const meta = LANGUAGE_META[code];
              const selected = lang === code;
              const isLast = i === arr.length - 1;
              return (
                <Pressable
                  key={code}
                  style={({ pressed }) => [
                    styles.rowItem,
                    {
                      borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: theme.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => void changeLang(code)}>
                  <Icon
                    name={{ ios: 'globe', android: 'language', web: 'globe' }}
                    size={22}
                    tintColor={selected ? Brand.primary : theme.textSecondary}
                    style={styles.rowIconSymbol}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>{meta.name}</Text>
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{meta.native}</Text>
                  </View>
                  {selected && (
                    <View style={[styles.selectedDot, { backgroundColor: Brand.primary }]}>
                      <Icon
                        name={{ ios: 'checkmark', android: 'check', web: 'checkmark' }}
                        size={12}
                        tintColor="#FFFFFF"
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* Coming soon languages */}
            <View style={[styles.comingSoonBlock, { borderTopColor: theme.border }]}>
              <Text style={[styles.comingSoonLabel, { color: theme.textTertiary }]}>
                More languages coming soon
              </Text>
              <View style={styles.comingSoonChips}>
                {COMING_SOON_LANGUAGES.map((l) => (
                  <View
                    key={l.code}
                    style={[styles.comingSoonChip, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={styles.comingSoonChipText}>{l.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {saved && (
            <Text style={[styles.savedNote, { color: Brand.primary }]}>Language saved</Text>
          )}

          {/* About section */}
          <SectionHeader label="About Apomuden" />
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            {[
              { icon: { ios: 'cross.case.fill', android: 'local_hospital', web: 'cross.case.fill' } as const, title: 'Medical Information', sub: 'Apomuden provides general health education — not diagnosis or treatment.' },
              { icon: { ios: 'lock.fill', android: 'lock', web: 'lock.fill' } as const, title: 'Privacy', sub: 'Your questions are processed to answer you. No data is stored on Apomuden\'s servers.' },
              { icon: { ios: 'globe', android: 'public', web: 'globe' } as const, title: 'Community Health', sub: 'Designed for communities in West Africa with local language support.' },
            ].map((item, i, arr) => (
              <View
                key={item.title}
                style={[
                  styles.rowItem,
                  {
                    borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: theme.border,
                  },
                ]}>
                <Icon name={item.icon} size={22} tintColor={Brand.primary} style={styles.rowIconSymbol} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{item.sub}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Emergency */}
          <SectionHeader label="Emergency" />
          <View style={[styles.emergencyCard, { borderColor: '#FECACA' }]}>
            {[
              { label: 'Emergency Services', value: '999 / 112' },
              { label: 'Ambulance (Ghana)', value: '193' },
              { label: 'CHPS / Community Health', value: 'Visit nearest CHPS compound' },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.emergencyRow,
                  {
                    borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: '#FECACA',
                  },
                ]}>
                <Text style={[styles.emergencyLabel, { color: '#991B1B' }]}>{row.label}</Text>
                <Text style={[styles.emergencyValue, { color: '#7F1D1D' }]}>{row.value}</Text>
              </View>
            ))}
          </View>

          {/* App info & reset */}
          <SectionHeader label="App" />
          <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
            <View style={[styles.rowItem, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <Icon
                name={{ ios: 'info.circle.fill', android: 'info', web: 'info.circle.fill' }}
                size={22}
                tintColor={Brand.primary}
                style={styles.rowIconSymbol}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Version</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>Apomuden 1.0</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.rowItem,
                { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleReset}>
              <Icon
                name={{ ios: 'arrow.counterclockwise', android: 'refresh', web: 'arrow.counterclockwise' }}
                size={22}
                tintColor="#EF4444"
                style={styles.rowIconSymbol}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Reset Onboarding</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                  Clear profile and return to welcome screen
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.rowItem, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleSignOut}>
              <Icon
                name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'rectangle.portrait.and.arrow.right' }}
                size={22}
                tintColor="#EF4444"
                style={styles.rowIconSymbol}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Sign Out</Text>
                <Text style={[styles.rowSub, { color: theme.textSecondary }]}>
                  Sign out of your Apomuden account
                </Text>
              </View>
            </Pressable>
          </View>

        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
      {label.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: Spacing.four,
  },
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.xl,
    marginBottom: Spacing.four,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: 4,
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
    marginTop: Spacing.three,
    marginLeft: 4,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  cardLabel: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowIcon: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  rowIconSymbol: {
    width: 30,
    alignItems: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheck: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  comingSoonBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  comingSoonLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  comingSoonChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  comingSoonChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  comingSoonChipText: {
    fontSize: 12,
    color: '#909090',
    fontWeight: '500',
  },
  savedNote: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  emergencyCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FEF2F2',
    marginBottom: Spacing.two,
  },
  emergencyRow: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  emergencyLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  emergencyValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
