import * as FileSystem from 'expo-file-system/legacy';

const FILE = `${FileSystem.documentDirectory}aura_prefs.json`;

async function read(): Promise<Record<string, unknown>> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return {};
    const text = await FileSystem.readAsStringAsync(FILE);
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function write(data: Record<string, unknown>): Promise<void> {
  await FileSystem.writeAsStringAsync(FILE, JSON.stringify(data));
}

export async function getPref<T>(key: string, fallback: T): Promise<T> {
  const data = await read();
  return (key in data ? (data[key] as T) : fallback);
}

export async function setPref(key: string, value: unknown): Promise<void> {
  const data = await read();
  data[key] = value;
  await write(data);
}

export async function getPrefs(): Promise<Record<string, unknown>> {
  return read();
}
