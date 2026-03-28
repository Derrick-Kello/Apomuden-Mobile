export function normalizeKhayaTextResponse(raw: string): string {
  const t = raw.trim();
  try {
    const parsed: unknown = JSON.parse(t);
    if (typeof parsed === 'string') {
      return parsed;
    }
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'text' in parsed &&
      typeof (parsed as { text: unknown }).text === 'string'
    ) {
      return (parsed as { text: string }).text;
    }
    if (parsed !== null && typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
    return String(parsed);
  } catch {
    return t;
  }
}
