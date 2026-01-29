import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProfile } from "../../types/auth";

const STORAGE_KEY = "shekinah_auth_v1";

type StoredAuthSession = {
  profile: AuthProfile;
  teacherLevels?: unknown[];
  sessionCookie?: string | null;
  accessToken?: string | null;
  savedAt: number;
};

const isValidSession = (value: any): value is StoredAuthSession => {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.profile &&
      typeof value.profile.id === "string" &&
      typeof value.profile.name === "string" &&
      typeof value.profile.email === "string" &&
      typeof value.profile.role === "string" &&
      ((typeof value.sessionCookie === "string" && value.sessionCookie.length > 0) ||
        (typeof value.accessToken === "string" && value.accessToken.length > 0))
  );
};

const normalizeTeacherLevels = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

export const loadAuthSession = async (): Promise<StoredAuthSession | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const session = isValidSession(parsed)
      ? { ...parsed, teacherLevels: normalizeTeacherLevels(parsed.teacherLevels) }
      : null;
    return session;
  } catch {
    return null;
  }
};

export const saveAuthSession = async (
  profile: AuthProfile,
  auth: { sessionCookie?: string | null; accessToken?: string | null },
  teacherLevels?: unknown[]
) => {
  const payload: StoredAuthSession = {
    profile,
    teacherLevels: normalizeTeacherLevels(teacherLevels),
    sessionCookie: auth.sessionCookie ?? null,
    accessToken: auth.accessToken ?? null,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearAuthSession = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};