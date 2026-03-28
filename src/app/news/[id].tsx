import { Icon } from '@/components/icon';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    Image, Pressable, ScrollView,
    StyleSheet, Text, View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchTodayHealthNews, timeAgo, type NewsArticle } from '@/lib/newsdata';

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme  = useColorScheme();
  const isDark  = scheme === 'dark';
  const colors  = Colors[isDark ? 'dark' : 'light'];

  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [imgError, setImgError] = useState(false);

  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(24);
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  useEffect(() => {
    fetchTodayHealthNews().then((articles) => {
      const found = articles.find((a) => a.article_id === id);
      setArticle(found ?? null);
      fadeIn.value  = withTiming(1, { duration: 380 });
      slideUp.value = withTiming(0, { duration: 380 });
    });
  }, [id, fadeIn, slideUp]);

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Back button — floats over image */}
      <SafeAreaView edges={['top']} style={s.backWrap}>
        <Pressable
          style={[s.backBtn, { backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.88)' }]}
          onPress={() => router.back()}>
          <Icon
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'chevron.left' }}
            size={20}
            tintColor={colors.text}
          />
        </Pressable>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero image */}
        {article?.image_url && !imgError ? (
          <Image
            source={{ uri: article.image_url }}
            style={s.hero}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[s.hero, s.heroFallback, { backgroundColor: Brand.primaryFaint }]}>
            <Icon
              name={{ ios: 'newspaper.fill', android: 'article', web: 'newspaper.fill' }}
              size={48}
              tintColor={Brand.primaryMuted}
            />
          </View>
        )}

        <Animated.View style={[s.body, fadeStyle]}>
          {/* Source + time */}
          <View style={s.meta}>
            <View style={[s.sourcePill, { backgroundColor: Brand.primaryFaint }]}>
              <Text style={[s.sourceText, { color: Brand.primary }]}>
                {article?.source_name ?? '…'}
              </Text>
            </View>
            <Text style={[s.timeText, { color: colors.textTertiary }]}>
              {timeAgo(article?.pubDate ?? null)}
            </Text>
          </View>

          {/* Title */}
          <Text style={[s.title, { color: colors.text, fontFamily: Fonts?.rounded }]}>
            {article?.title ?? ''}
          </Text>

          {/* Description */}
          {article?.description ? (
            <Text style={[s.description, { color: colors.textSecondary }]}>
              {article.description}
            </Text>
          ) : null}

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: colors.border }]} />

          {/* Ask Apomuden about this */}
          <Pressable
            style={[s.auraBtn, { backgroundColor: Brand.primaryFaint }]}
            onPress={() => router.navigate('/assistant')}>
            <View style={[s.auraBtnIcon, { backgroundColor: Brand.primary }]}>
              <Icon
                name={{ ios: 'mic.fill', android: 'mic', web: 'mic.fill' }}
                size={16}
                tintColor="#FFFFFF"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.auraBtnTitle, { color: colors.text }]}>Ask Apomuden about this</Text>
              <Text style={[s.auraBtnSub, { color: colors.textSecondary }]}>
                Get a plain-language health explanation
              </Text>
            </View>
            <Icon
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron.right' }}
              size={16}
              tintColor={colors.textTertiary}
            />
          </Pressable>

          {/* Read full article */}
          {article?.link ? (
            <Pressable
              style={({ pressed }) => [s.readBtn, { backgroundColor: Brand.primary, opacity: pressed ? 0.88 : 1 }]}
              onPress={() => void WebBrowser.openBrowserAsync(article.link)}>
              <Text style={s.readBtnText}>Read Full Article</Text>
              <Icon
                name={{ ios: 'arrow.up.right', android: 'open_in_new', web: 'arrow.up.right' }}
                size={16}
                tintColor="#FFFFFF"
              />
            </Pressable>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const HERO_H = 280;

const s = StyleSheet.create({
  root: { flex: 1 },
  backWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.three,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  hero: { width: '100%', height: HERO_H },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourcePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  sourceText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  timeText: { fontSize: 12 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
  },
  divider: { height: StyleSheet.hairlineWidth },
  auraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.xl,
  },
  auraBtnIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  auraBtnTitle: { fontSize: 15, fontWeight: '600' },
  auraBtnSub: { fontSize: 13, marginTop: 1 },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 16,
    borderRadius: Radius.xl,
  },
  readBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
