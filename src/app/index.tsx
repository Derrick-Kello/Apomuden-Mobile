import { Icon } from '@/components/icon';
import { router } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Image,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, Brand, Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { fetchTodayHealthNews, timeAgo, type NewsArticle } from '@/lib/newsdata';
import { getPref } from '@/lib/storage';

// ─── Health tips (one shown per day) ─────────────────────────────────────────
const HEALTH_TIPS = [
  { tip: 'Drink at least 8 glasses of water each day to stay hydrated and healthy.', icon: { ios: 'drop.fill', android: 'water_drop', web: 'drop.fill' } as const, category: 'Hydration' },
  { tip: 'Sleep 7–8 hours every night to keep your immune system strong.', icon: { ios: 'moon.fill', android: 'bedtime', web: 'moon.fill' } as const, category: 'Rest' },
  { tip: 'Use an insecticide-treated mosquito net every night to prevent malaria.', icon: { ios: 'shield.fill', android: 'health_and_safety', web: 'shield.fill' } as const, category: 'Malaria' },
  { tip: 'Wash your hands with soap before eating and after using the toilet.', icon: { ios: 'hands.sparkles.fill', android: 'clean_hands', web: 'hands.sparkles.fill' } as const, category: 'Hygiene' },
  { tip: 'Attend all prenatal check-ups during pregnancy — at least 8 visits.', icon: { ios: 'heart.fill', android: 'favorite', web: 'heart.fill' } as const, category: 'Maternal Health' },
  { tip: 'Eat a variety of colourful fruits and vegetables every day.', icon: { ios: 'leaf.fill', android: 'eco', web: 'leaf.fill' } as const, category: 'Nutrition' },
  { tip: 'Breastfeed exclusively for the first 6 months of your baby\'s life.', icon: { ios: 'heart.circle.fill', android: 'child_care', web: 'heart.circle.fill' } as const, category: 'Child Health' },
  { tip: 'Vaccinate your children on schedule — vaccines are free at health centres.', icon: { ios: 'cross.case.fill', android: 'vaccines', web: 'cross.case.fill' } as const, category: 'Vaccines' },
  { tip: 'Exercise for at least 30 minutes on most days of the week.', icon: { ios: 'figure.run', android: 'directions_run', web: 'figure.run' } as const, category: 'Fitness' },
  { tip: 'Know the signs of stroke: face drooping, arm weakness, slurred speech.', icon: { ios: 'brain.head.profile', android: 'psychology', web: 'brain.head.profile' } as const, category: 'Heart Health' },
  { tip: 'Keep wounds clean and covered with a bandage to prevent infection.', icon: { ios: 'bandage.fill', android: 'healing', web: 'bandage.fill' } as const, category: 'First Aid' },
  { tip: 'Know your HIV status — testing is confidential and often free.', icon: { ios: 'ribbon.fill', android: 'volunteer_activism', web: 'ribbon.fill' } as const, category: 'HIV' },
  { tip: 'Talking about your feelings with someone you trust protects mental health.', icon: { ios: 'bubble.left.fill', android: 'chat', web: 'bubble.left.fill' } as const, category: 'Mental Health' },
  { tip: 'Drink only clean, boiled, or treated water to prevent diarrhoea.', icon: { ios: 'drop.circle.fill', android: 'water_drop', web: 'drop.circle.fill' } as const, category: 'Clean Water' },
] as const;

// ─── Quick categories ─────────────────────────────────────────────────────────
const QUICK_CATS = [
  { id: 'malaria', label: 'Malaria', icon: { ios: 'shield.fill', android: 'health_and_safety', web: 'shield.fill' } as const, bg: '#FEF9C3', fg: '#713F12' },
  { id: 'maternal', label: 'Maternal', icon: { ios: 'heart.fill', android: 'favorite', web: 'heart.fill' } as const, bg: '#FCE7F3', fg: '#831843' },
  { id: 'nutrition', label: 'Nutrition', icon: { ios: 'leaf.fill', android: 'eco', web: 'leaf.fill' } as const, bg: '#D1FAE5', fg: '#065F46' },
  { id: 'mental', label: 'Mental Health', icon: { ios: 'brain.head.profile', android: 'psychology', web: 'brain.head.profile' } as const, bg: '#EDE9FE', fg: '#4C1D95' },
  { id: 'water', label: 'Clean Water', icon: { ios: 'drop.fill', android: 'water_drop', web: 'drop.fill' } as const, bg: '#DBEAFE', fg: '#1E3A5F' },
  { id: 'firstaid', label: 'First Aid', icon: { ios: 'bandage.fill', android: 'healing', web: 'bandage.fill' } as const, bg: '#FEE2E2', fg: '#7F1D1D' },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeGreeting(lang: string): string {
  const h = new Date().getHours();
  if (lang === 'tw') {
    if (h < 12) return 'Mema wo akye';
    if (h < 17) return 'Mema wo aha';
    return 'Mema wo adwo';
  }
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayTipIndex(): number {
  return Math.floor(Date.now() / 86_400_000) % HEALTH_TIPS.length;
}

// ─── News skeleton card ───────────────────────────────────────────────────────
function SkeletonCard({ colors }: { colors: typeof Colors.light }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    return () => pulse.stopAnimation();
  }, [pulse]);
  return (
    <Animated.View style={[nc.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border, opacity: pulse }]}>
      <View style={[nc.cardImage, { backgroundColor: colors.backgroundElement }]} />
      <View style={nc.cardBody}>
        <View style={[nc.skLine, { width: 80, backgroundColor: colors.backgroundElement }]} />
        <View style={[nc.skLine, { width: '100%', height: 16, backgroundColor: colors.backgroundElement, marginTop: 8 }]} />
        <View style={[nc.skLine, { width: '75%', height: 16, backgroundColor: colors.backgroundElement, marginTop: 6 }]} />
        <View style={[nc.skLine, { width: '55%', height: 12, backgroundColor: colors.backgroundElement, marginTop: 10 }]} />
      </View>
    </Animated.View>
  );
}

// ─── News card — social media style ──────────────────────────────────────────
function NewsCard({ article, colors, onPress }: {
  article: NewsArticle;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!article.image_url && !imgError;

  return (
    <Pressable
      style={({ pressed }) => [nc.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border, opacity: pressed ? 0.94 : 1 }]}
      onPress={onPress}>

      {/* Full-bleed image */}
      {hasImage ? (
        <Image
          source={{ uri: article.image_url! }}
          style={nc.cardImage}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[nc.cardImage, nc.cardImageFallback, { backgroundColor: Brand.primaryFaint }]}>
          <Icon name={{ ios: 'newspaper.fill', android: 'article', web: 'newspaper.fill' }} size={36} tintColor={Brand.primaryMuted} />
        </View>
      )}

      {/* Content */}
      <View style={nc.cardBody}>
        {/* Source row */}
        <View style={nc.cardMeta}>
          <View style={[nc.sourcePill, { backgroundColor: Brand.primaryFaint }]}>
            <Text style={[nc.sourceText, { color: Brand.primary }]} numberOfLines={1}>
              {article.source_name}
            </Text>
          </View>
          <Text style={[nc.timeText, { color: colors.textTertiary }]}>
            {timeAgo(article.pubDate)}
          </Text>
        </View>

        {/* Title */}
        <Text style={[nc.cardTitle, { color: colors.text }]} numberOfLines={3}>
          {article.title}
        </Text>

        {/* Description preview */}
        {article.description ? (
          <Text style={[nc.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {article.description}
          </Text>
        ) : null}

        {/* Footer */}
        <View style={nc.cardFooter}>
          <Text style={[nc.readMore, { color: Brand.primary }]}>Read more</Text>
          <Icon
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron.right' }}
            size={13}
            tintColor={Brand.primary}
          />
        </View>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [name, setName] = useState('');
  const [lang, setLang] = useState('en');
  const tip = HEALTH_TIPS[todayTipIndex()];

  const [news, setNews]           = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError]   = useState<string | null>(null);

  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(18)).current;

  const loadNews = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const articles = await fetchTodayHealthNews();
      setNews(articles);
    } catch (e) {
      setNewsError(e instanceof Error ? e.message : 'Could not load news.');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [n, l] = await Promise.all([
        getPref<string>('name', 'Friend'),
        getPref<string>('language', 'en'),
      ]);
      setName(n);
      setLang(l);
    })();

    void loadNews();

    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, delay: 100, useNativeDriver: true }),
      Animated.spring(cardTranslate, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [cardOpacity, cardTranslate, loadNews]);

  const initial = (name.trim().charAt(0) || 'A').toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BottomTabInset + 40 }}>
        <SafeAreaView edges={['top']} style={styles.safe}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                {timeGreeting(lang)}
              </Text>
              <Text style={[styles.heroName, { color: theme.text, fontFamily: Fonts?.rounded }]}>
                {name || 'Friend'}
              </Text>
            </View>
            <Pressable
              style={[styles.avatar, { backgroundColor: Brand.primaryMuted }]}
              onPress={() => router.navigate('/profile')}>
              <Text style={[styles.avatarText, { color: Brand.accent }]}>{initial}</Text>
            </Pressable>
          </View>

          {/* Language chip */}
          <View style={styles.chipRow}>
            <View style={[styles.langChip, { backgroundColor: Brand.primaryFaint, borderColor: Brand.primaryMuted }]}>
              <Icon
                name={{ ios: 'globe', android: 'language', web: 'globe' }}
                size={13}
                tintColor={Brand.accent}
              />
              <Text style={[styles.langChipText, { color: Brand.accent }]}>
                {lang === 'tw' ? 'Twi' : 'English'}
              </Text>
            </View>
          </View>

          <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }}>

            {/* Ask Apomuden CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.auraCta,
                { backgroundColor: Brand.accent, opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={() => router.navigate('/assistant')}>
              <View style={styles.auraCtaLeft}>
                <View style={styles.auraCtaMicBg}>
                  <Icon
                    name={{ ios: 'mic.fill', android: 'mic', web: 'mic.fill' }}
                    size={22}
                    tintColor="#FFFFFF"
                  />
                </View>
                <View>
                  <Text style={[styles.auraCtaTitle, { fontFamily: Fonts?.rounded }]}>
                    Ask Apomuden
                  </Text>
                  <Text style={styles.auraCtaSub}>
                    {lang === 'tw' ? 'Ka asem bi ma me…' : 'Ask me anything…'}
                  </Text>
                </View>
              </View>
              <Icon
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron.right' }}
                size={18}
                tintColor="rgba(255,255,255,0.6)"
              />
            </Pressable>

            {/* Today's Health Tip */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Today's Health Tip
            </Text>
            <View style={[styles.tipCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}>
              <View style={styles.tipLottieWrap}>
                <LottieView
                  source={require('@/assets/lottie/health-pulse.json')}
                  autoPlay
                  loop
                  style={styles.tipLottie}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipText, { color: theme.text }]}>{tip.tip}</Text>
                <Text style={[styles.tipCategory, { color: Brand.primary }]}>{tip.category}</Text>
              </View>
            </View>

            {/* Browse Topics */}
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Browse Topics
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catsScroll}>
              {QUICK_CATS.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.catChip,
                    { backgroundColor: cat.bg, opacity: pressed ? 0.85 : 1 },
                  ]}
                  onPress={() => router.navigate('/learn')}>
                  <Icon name={cat.icon} size={16} tintColor={cat.fg} />
                  <Text style={[styles.catLabel, { color: cat.fg }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Health News */}
            <View style={styles.newsSectionHeader}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginBottom: 0, marginTop: 0 }]}>
                Health News
              </Text>
              {newsError && !newsLoading && (
                <Pressable onPress={loadNews} style={styles.retryBtn}>
                  <Icon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'arrow.clockwise' }} size={12} tintColor={Brand.primary} />
                  <Text style={[styles.retryText, { color: Brand.primary }]}>Retry</Text>
                </Pressable>
              )}
            </View>

            {newsLoading ? (
              <View style={styles.newsList}>
                <SkeletonCard colors={colors} />
                <SkeletonCard colors={colors} />
                <SkeletonCard colors={colors} />
              </View>
            ) : newsError && news.length === 0 ? (
              <View style={[styles.newsErrorBox, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
                <Icon name={{ ios: 'wifi.slash', android: 'wifi_off', web: 'wifi.slash' }} size={22} tintColor={theme.textTertiary} />
                <Text style={[styles.newsErrorText, { color: theme.textSecondary }]}>
                  {newsError}
                </Text>
              </View>
            ) : (
              <View style={styles.newsList}>
                {news.map((article) => (
                  <NewsCard
                    key={article.article_id}
                    article={article}
                    colors={colors}
                    onPress={() => router.navigate(`/news/${article.article_id}`)}
                  />
                ))}
              </View>
            )}

            {/* Emergency banner */}
            {Platform.OS !== 'web' && (
              <View style={[styles.emergencyBanner, { borderColor: '#FECACA' }]}>
                <Icon
                  name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'exclamationmark.triangle.fill' }}
                  size={22}
                  tintColor="#DC2626"
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.emergencyTitle, { color: '#991B1B' }]}>Emergency?</Text>
                  <Text style={[styles.emergencySub, { color: '#B91C1C' }]}>
                    Call 999 or go to your nearest hospital
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </SafeAreaView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 2,
  },
  heroName: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: Spacing.four,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  langChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  auraCta: {
    borderRadius: Radius.xl,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  auraCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  auraCtaMicBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraCtaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  auraCtaSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  tipCard: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  tipLottieWrap: {
    width: 64,
    height: 64,
    flexShrink: 0,
  },
  tipLottie: {
    width: 64,
    height: 64,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  tipCategory: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  catsScroll: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
    marginBottom: Spacing.four,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  catLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  emergencySub: {
    fontSize: 13,
    lineHeight: 18,
  },

  // News
  newsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Brand.primaryFaint,
  },
  retryText: { fontSize: 12, fontWeight: '600' },
  newsList: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  newsErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.four,
  },
  newsErrorText: { fontSize: 13, flex: 1, lineHeight: 18 },
});

// ─── News card styles ─────────────────────────────────────────────────────────
const nc = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 2,
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourcePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    maxWidth: '65%',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  timeText: { fontSize: 11 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Skeleton
  skLine: {
    height: 10,
    borderRadius: 5,
  },
});
