import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEntry<T> = {
  timestamp: number;
  ttlMs: number;
  data: T;
};

const CACHE_PREFIX = "api-cache:";

const hashString = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const makeApiCacheKey = (parts: Record<string, unknown>) => {
  return `${CACHE_PREFIX}${hashString(JSON.stringify(parts))}`;
};

export const getCachedResponse = async <T>(
  key: string
): Promise<{ data: T; isExpired: boolean } | null> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const ttlMs = Number(entry.ttlMs ?? 0);
    const timestamp = Number(entry.timestamp ?? 0);
    const isExpired = ttlMs > 0 ? Date.now() - timestamp > ttlMs : false;
    return { data: entry.data, isExpired };
  } catch {
    return null;
  }
};

export const setCachedResponse = async <T>(
  key: string,
  data: T,
  ttlMs: number
) => {
  try {
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      ttlMs,
      data,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore cache write failures.
  }
};

export const hashSensitiveValue = (value: string | null | undefined) => {
  return value ? hashString(value) : null;
};
