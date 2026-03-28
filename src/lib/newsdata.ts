import { getPref, setPref } from '@/lib/storage';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NewsArticle {
  article_id: string;
  title: string;
  link: string;
  description: string | null;
  pubDate: string | null;          // "YYYY-MM-DD HH:mm:ss"
  image_url: string | null;
  source_name: string;
  source_icon: string | null;
}

interface NewsDataResponse {
  status: string;
  results?: NewsArticle[];
}

// ─── Config ───────────────────────────────────────────────────────────────────
const API_KEY =
  (process.env.EXPO_PUBLIC_NEWS_API_KEY ?? 'pub_9370695f0224491d97d7b16986e2554e').trim();

const FETCH_URL =
  `https://newsdata.io/api/1/latest` +
  `?apikey=${API_KEY}` +
  `&q=Health` +
  `&country=gh,ng,gb,us,cn` +
  `&category=health` +
  `&size=10`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayString(): string {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Human-readable relative time from a NewsData pub date string. */
export function timeAgo(pubDate: string | null): string {
  if (!pubDate) return '';
  // "YYYY-MM-DD HH:mm:ss" → ISO 8601
  const iso = pubDate.replace(' ', 'T') + 'Z';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ─── Fetch with daily cache ───────────────────────────────────────────────────
export async function fetchTodayHealthNews(): Promise<NewsArticle[]> {
  const today = todayString();
  const [cached, cachedDate] = await Promise.all([
    getPref<NewsArticle[] | null>('news_articles', null),
    getPref<string>('news_date', ''),
  ]);

  if (Array.isArray(cached) && cached.length > 0 && cachedDate === today) {
    return cached;
  }

  const res = await fetch(FETCH_URL);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`News fetch failed (${res.status}): ${body.slice(0, 120)}`);
  }

  const data = (await res.json()) as NewsDataResponse;
  if (data.status !== 'success') {
    throw new Error(`NewsData error: unexpected status "${data.status}"`);
  }

  const articles = (data.results ?? []).filter((a) => !!a.title);

  // Persist for the rest of the day
  await Promise.all([
    setPref('news_articles', articles),
    setPref('news_date', today),
  ]);

  return articles;
}
