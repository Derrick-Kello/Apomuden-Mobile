import { Icon } from '@/components/icon';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { BottomTabInset, Brand, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Data ──────────────────────────────────────────────────────────────────────
interface Topic {
  title: string;
  content: string;
  youtubeId: string;   // YouTube video ID — swap for the best match per topic
}

interface Category {
  id: string;
  name: string;
  icon: { ios: string; android: string; web: string };
  color: string;
  bg: string;
  topics: Topic[];
}

const CATEGORIES: Category[] = [
  {
    id: 'malaria',
    name: 'Malaria',
    icon: { ios: 'shield.fill', android: 'health_and_safety', web: 'shield.fill' },
    color: '#713F12', bg: '#FEF9C3',
    topics: [
      { title: 'Prevention', youtubeId: 'UXhDHFBSSKI',
        content: 'Sleep under an insecticide-treated mosquito net every night. Remove standing water where mosquitoes breed. Apply repellent, especially in the evenings.' },
      { title: 'Symptoms', youtubeId: 'FiXNxZbp_pY',
        content: 'Malaria causes fever, chills, headache, muscle aches, and vomiting. Symptoms appear 10–15 days after a bite. See a doctor immediately.' },
      { title: 'Treatment', youtubeId: '3dFMlUhqhyQ',
        content: 'Malaria is curable. Go to a health facility for a rapid test. Take the full course of medicine, even after you feel better.' },
      { title: 'Children & Malaria', youtubeId: 'L4s_OphNSqs',
        content: 'Young children are especially vulnerable. Watch for high fever, fast breathing, and refusal to eat. Go to a health centre immediately.' },
    ],
  },
  {
    id: 'maternal',
    name: 'Maternal Health',
    icon: { ios: 'heart.fill', android: 'favorite', web: 'heart.fill' },
    color: '#831843', bg: '#FCE7F3',
    topics: [
      { title: 'Antenatal Care', youtubeId: 'o83mPBAfAEU',
        content: 'Visit a healthcare provider at least 8 times during pregnancy. Start as soon as you know you are pregnant. Early visits detect complications early.' },
      { title: 'Nutrition in Pregnancy', youtubeId: 'BXnQJrRuVHo',
        content: 'Eat iron-rich foods (beans, leafy greens, fish). Take folic acid early. Avoid alcohol, smoking, and unprescribed medicines.' },
      { title: 'Danger Signs', youtubeId: 'sJQYMNt8W0U',
        content: 'Seek immediate help for heavy bleeding, severe headache, high fever, no fetal movement, or swollen face and hands. These are emergencies.' },
      { title: 'Breastfeeding', youtubeId: 'fzUkPSQlJQI',
        content: 'Breastfeed exclusively for the first 6 months — no water, juice, or other foods. Breast milk provides complete nutrition and protects against infections.' },
    ],
  },
  {
    id: 'nutrition',
    name: 'Nutrition',
    icon: { ios: 'leaf.fill', android: 'eco', web: 'leaf.fill' },
    color: '#065F46', bg: '#D1FAE5',
    topics: [
      { title: 'Balanced Diet', youtubeId: 'YzBFHEbEgSA',
        content: 'Include carbohydrates (yam, rice, plantain), proteins (beans, fish, eggs), healthy fats, and plenty of vegetables and fruits in every meal.' },
      { title: 'Iron-Rich Foods', youtubeId: 'OEnGEKLQp0U',
        content: 'Beans, lentils, liver, dark leafy greens, and groundnuts are rich in iron. Eat them with vitamin C foods to absorb more iron.' },
      { title: "Children's Nutrition", youtubeId: 'NQpFX-tCFJI',
        content: 'Introduce soft, mashed foods at 6 months alongside breastfeeding. Include eggs, fish, and coloured vegetables for healthy development.' },
      { title: 'Diabetes & Diet', youtubeId: 'wZAjVQsPr2g',
        content: 'Limit sugary drinks and processed foods. Eat more whole grains, vegetables, and beans. Eat smaller portions regularly.' },
    ],
  },
  {
    id: 'mental',
    name: 'Mental Health',
    icon: { ios: 'brain.head.profile', android: 'psychology', web: 'brain.head.profile' },
    color: '#4C1D95', bg: '#EDE9FE',
    topics: [
      { title: 'Common Signs', youtubeId: 'nEOVPqbdHZk',
        content: 'Signs of mental distress include persistent sadness, loss of interest, sleep problems, and withdrawing from others. These conditions can be treated.' },
      { title: 'Seeking Help', youtubeId: 'eBbEDRKcnAM',
        content: 'Talk to a trusted person, community health worker, or mental health professional. Asking for help is a sign of strength.' },
      { title: 'Self-Care', youtubeId: 'WQmKkSMGMKU',
        content: 'Stay connected with family and friends. Get enough sleep. Exercise regularly. Practice faith or meaningful activities. Be kind to yourself.' },
      { title: 'Supporting Others', youtubeId: 'Uo08uS904Rg',
        content: 'Listen without judgement. Do not dismiss feelings. Encourage professional help. Check in regularly.' },
    ],
  },
  {
    id: 'water',
    name: 'Clean Water',
    icon: { ios: 'drop.fill', android: 'water_drop', web: 'drop.fill' },
    color: '#1E3A5F', bg: '#DBEAFE',
    topics: [
      { title: 'Safe Water Sources', youtubeId: '2I_ZiDPmPcM',
        content: 'Use piped, certified borehole, or treated well water. Boil for at least 1 minute if unsure. Store in clean, covered containers.' },
      { title: 'Treating Water', youtubeId: '3-CQxQINJgY',
        content: 'Boiling kills most germs. You can also use water treatment tablets or 2 drops of bleach per litre. Certified filters also work.' },
      { title: 'Handwashing', youtubeId: 'bFKJF1eA7OM',
        content: 'Wash hands with soap for 20 seconds before eating, after using the toilet, after touching animals, and before cooking.' },
      { title: 'Diarrhoea', youtubeId: 'ZIcIqGLH6fQ',
        content: 'Often caused by unsafe water. Treat with ORS (Oral Rehydration Solution). Seek care for blood in stool, high fever, or inability to keep fluids down.' },
    ],
  },
  {
    id: 'firstaid',
    name: 'First Aid',
    icon: { ios: 'bandage.fill', android: 'healing', web: 'bandage.fill' },
    color: '#7F1D1D', bg: '#FEE2E2',
    topics: [
      { title: 'Choking', youtubeId: 'PA9hpOnvtCk',
        content: 'Give 5 firm back blows then 5 abdominal thrusts for adults. For infants: 5 back blows then 5 chest thrusts. Call for help immediately.' },
      { title: 'Burns', youtubeId: 'kFdnmCCHIbY',
        content: 'Cool under running water for 20 minutes. Never use ice, butter, or toothpaste. Cover with a clean bandage. Seek care for large burns.' },
      { title: 'Bleeding', youtubeId: '3KbvLvjSASU',
        content: 'Apply firm, direct pressure with a clean cloth. Do not remove it — add more if needed. Elevate the limb. Seek emergency care for severe bleeding.' },
      { title: 'Fever', youtubeId: 'n4mY8-RPJdw',
        content: 'Give paracetamol following dosage instructions. Remove excess clothing. Encourage fluids. Seek care for fever above 38.5°C in babies under 3 months.' },
    ],
  },
  {
    id: 'vaccines',
    name: 'Vaccines',
    icon: { ios: 'cross.case.fill', android: 'vaccines', web: 'cross.case.fill' },
    color: '#0C4A6E', bg: '#E0F2FE',
    topics: [
      { title: 'Child Vaccinations', youtubeId: 'L49Qn0iZgV0',
        content: "Ghana's immunisation programme protects children from polio, measles, diphtheria, tetanus, hepatitis B, and more. Vaccines are free at government health centres." },
      { title: 'Why Vaccinate', youtubeId: 'rb5RiegOV9o',
        content: 'Vaccines protect individuals and communities. When enough people are vaccinated, diseases cannot spread.' },
      { title: 'Adult Vaccines', youtubeId: 'gfK6I01yJts',
        content: 'Adults need tetanus boosters every 10 years, flu vaccine annually, and travel vaccines. Ask your healthcare provider.' },
      { title: 'Safety', youtubeId: 'pBnQFJr9GgE',
        content: 'Vaccines undergo rigorous testing. Side effects are usually mild and short-lived. The protection they provide far outweighs any risk.' },
    ],
  },
  {
    id: 'hiv',
    name: 'HIV & AIDS',
    icon: { ios: 'ribbon.fill', android: 'volunteer_activism', web: 'ribbon.fill' },
    color: '#881337', bg: '#FFF1F2',
    topics: [
      { title: 'Prevention', youtubeId: 'wnnzCNY9S04',
        content: 'Abstain or use condoms consistently. Get tested with your partner. Treatment reduces transmission to near zero. Never share needles.' },
      { title: 'Testing', youtubeId: 'rM0UrJFzn8U',
        content: 'Tests are quick, confidential, and often free. Available at health centres, clinics, and community outreach programmes.' },
      { title: 'Treatment (ART)', youtubeId: 'H5LhBixI2xk',
        content: 'ART controls HIV so people can live long, healthy lives. Take medicine daily as prescribed. Never stop without medical advice.' },
      { title: 'Living Well', youtubeId: 'tHxj2MYVQgE',
        content: 'With treatment, people with HIV live full, active lives. Eat well, exercise, avoid smoking, and attend regular check-ups.' },
    ],
  },
];

// ─── YouTube embed HTML ────────────────────────────────────────────────────────
function youtubeHtml(videoId: string) {
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0;background:#000}body,html{width:100%;height:100%;overflow:hidden}</style>
</head><body>
<iframe width="100%" height="100%"
  src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1"
  frameborder="0" allow="autoplay;encrypted-media;fullscreen;picture-in-picture"
  allowfullscreen></iframe>
</body></html>`;
}

const THUMB = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// ─── Topic card ────────────────────────────────────────────────────────────────
function TopicCard({ topic, cat, expanded, onToggle }: {
  topic: Topic;
  cat: Category;
  expanded: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const [playing, setPlaying] = useState(false);

  return (
    <View style={[tc.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
      {/* Thumbnail / Player */}
      <View style={tc.mediaWrap}>
        {playing ? (
          <WebView
            style={tc.player}
            source={{ html: youtubeHtml(topic.youtubeId) }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            scrollEnabled={false}
          />
        ) : (
          <Pressable style={tc.thumbWrap} onPress={() => { setPlaying(true); if (!expanded) onToggle(); }}>
            <Image
              source={{ uri: THUMB(topic.youtubeId) }}
              style={tc.thumb}
              resizeMode="cover"
            />
            {/* Play button overlay */}
            <View style={tc.playOverlay}>
              <View style={tc.playBtn}>
                <Icon
                  name={{ ios: 'play.fill', android: 'play_arrow', web: 'play.fill' }}
                  size={22}
                  tintColor="#FFFFFF"
                />
              </View>
            </View>
            {/* Category badge */}
            <View style={[tc.catBadge, { backgroundColor: cat.bg }]}>
              <Icon name={cat.icon} size={11} tintColor={cat.color} />
              <Text style={[tc.catBadgeText, { color: cat.color }]}>{cat.name}</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* Content */}
      <Pressable style={tc.body} onPress={onToggle}>
        <View style={tc.titleRow}>
          <Text style={[tc.title, { color: theme.text, fontFamily: Fonts?.rounded }]} numberOfLines={expanded ? undefined : 2}>
            {topic.title}
          </Text>
          <Icon
            name={expanded
              ? { ios: 'chevron.up', android: 'expand_less', web: 'chevron.up' }
              : { ios: 'chevron.down', android: 'expand_more', web: 'chevron.down' }}
            size={13}
            tintColor={theme.textTertiary}
          />
        </View>

        {expanded ? (
          <>
            <Text style={[tc.content, { color: theme.textSecondary }]}>{topic.content}</Text>

            <View style={tc.actions}>
              {!playing && (
                <Pressable
                  style={({ pressed }) => [tc.watchBtn, { backgroundColor: '#FF0000', opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => setPlaying(true)}>
                  <Icon name={{ ios: 'play.fill', android: 'play_arrow', web: 'play.fill' }} size={14} tintColor="#FFFFFF" />
                  <Text style={tc.watchBtnText}>Watch Video</Text>
                </Pressable>
              )}
              {playing && (
                <Pressable
                  style={({ pressed }) => [tc.watchBtn, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => setPlaying(false)}>
                  <Icon name={{ ios: 'stop.fill', android: 'stop', web: 'stop.fill' }} size={14} tintColor={theme.text} />
                  <Text style={[tc.watchBtnText, { color: theme.text }]}>Stop Video</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [tc.askBtn, { backgroundColor: Brand.primaryFaint, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.navigate('/assistant')}>
                <Icon name={{ ios: 'mic.fill', android: 'mic', web: 'mic.fill' }} size={14} tintColor={Brand.primary} />
                <Text style={[tc.askBtnText, { color: Brand.primary }]}>Ask Apomuden</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={[tc.preview, { color: theme.textSecondary }]} numberOfLines={2}>
            {topic.content}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const theme = useTheme();
  const [query, setQuery]         = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const filtered = CATEGORIES
    .filter((c) => activeCat === 'all' || c.id === activeCat)
    .flatMap((c) =>
      c.topics
        .filter((t) =>
          !query.trim() ||
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          c.name.toLowerCase().includes(query.toLowerCase()),
        )
        .map((t) => ({ topic: t, cat: c, key: `${c.id}-${t.title}` })),
    );

  return (
    <View style={[s.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BottomTabInset + 40 }}
        keyboardShouldPersistTaps="handled">
        <SafeAreaView edges={['top']} style={s.safe}>

          {/* Header */}
          <Text style={[s.title, { color: theme.text, fontFamily: Fonts?.rounded }]}>
            Health Topics
          </Text>

          {/* Search */}
          <View style={[s.searchWrap, { backgroundColor: theme.backgroundElement }]}>
            <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'magnifyingglass' }}
              size={15} tintColor={theme.textTertiary} />
            <TextInput
              style={[s.searchInput, { color: theme.text }]}
              placeholder="Search topics…"
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={(t) => { setQuery(t); setExpandedKey(null); setActiveCat('all'); }}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Icon name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'xmark.circle.fill' }}
                  size={16} tintColor={theme.textTertiary} />
              </Pressable>
            )}
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
            style={s.chipsScroll}>
            <Pressable
              style={[s.chip, activeCat === 'all' && { backgroundColor: Brand.primary }]}
              onPress={() => { setActiveCat('all'); setExpandedKey(null); }}>
              <Text style={[s.chipText, { color: activeCat === 'all' ? '#FFFFFF' : theme.textSecondary }]}>
                All
              </Text>
            </Pressable>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                style={[s.chip, activeCat === c.id && { backgroundColor: c.color }]}
                onPress={() => { setActiveCat(c.id); setExpandedKey(null); }}>
                <Icon name={c.icon} size={13} tintColor={activeCat === c.id ? '#FFFFFF' : c.color} />
                <Text style={[s.chipText, { color: activeCat === c.id ? '#FFFFFF' : theme.textSecondary }]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Topic cards */}
          <View style={s.cards}>
            {filtered.map(({ topic, cat, key }) => (
              <TopicCard
                key={key}
                topic={topic}
                cat={cat}
                expanded={expandedKey === key}
                onToggle={() => setExpandedKey(expandedKey === key ? null : key)}
              />
            ))}

            {filtered.length === 0 && (
              <View style={s.empty}>
                <View style={[s.emptyIcon, { backgroundColor: Brand.primaryFaint }]}>
                  <Icon name={{ ios: 'magnifyingglass', android: 'search', web: 'magnifyingglass' }}
                    size={28} tintColor={Brand.primary} />
                </View>
                <Text style={[s.emptyTitle, { color: theme.text }]}>No topics found</Text>
                <Text style={[s.emptySub, { color: theme.textSecondary }]}>
                  Try a different search or ask Apomuden directly
                </Text>
                <Pressable
                  style={[s.chip, { backgroundColor: Brand.primary, alignSelf: 'center' }]}
                  onPress={() => router.navigate('/assistant')}>
                  <Icon name={{ ios: 'mic.fill', android: 'mic', web: 'mic.fill' }} size={13} tintColor="#FFFFFF" />
                  <Text style={[s.chipText, { color: '#FFFFFF' }]}>Ask Apomuden</Text>
                </Pressable>
              </View>
            )}
          </View>

        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4, marginBottom: Spacing.three },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 12,
    marginBottom: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 15 },
  chipsScroll: { marginBottom: Spacing.three },
  chips: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: '#F0F0F0',
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  cards: { gap: Spacing.three },
  empty: { alignItems: 'center', paddingVertical: 48, gap: Spacing.three },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

const tc = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  mediaWrap: { width: '100%', aspectRatio: 16 / 9 },
  thumbWrap: { flex: 1, position: 'relative' },
  thumb: { width: '100%', height: '100%' },
  player: { flex: 1 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center', justifyContent: 'center',
    paddingLeft: 4, // optical center for play icon
  },
  catBadge: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  body: { padding: Spacing.three, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  title: { flex: 1, fontSize: 17, fontWeight: '700', letterSpacing: -0.2, lineHeight: 22 },
  preview: { fontSize: 14, lineHeight: 20 },
  content: { fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full,
  },
  watchBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  askBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: Radius.full,
  },
  askBtnText: { fontSize: 13, fontWeight: '700' },
});
