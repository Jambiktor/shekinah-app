import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shekinah_parent_prefs_v1";

type StoredPreferences = {
  userId: string;
  emailNotifications: boolean;
  savedAt: number;
};

const parseStoredPreferences = (raw: string | null): StoredPreferences | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.userId === "string" &&
      typeof parsed.emailNotifications === "boolean"
    ) {
      return parsed as StoredPreferences;
    }
  } catch {
    return null;
  }
  return null;
};

export const loadEmailNotificationPreference = async (
  userId: string
): Promise<boolean | null> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const stored = parseStoredPreferences(raw);
  if (!stored || stored.userId !== userId) {
    return null;
  }
  return stored.emailNotifications;
};

export const saveEmailNotificationPreference = async (
  userId: string,
  enabled: boolean
) => {
  const payload: StoredPreferences = {
    userId,
    emailNotifications: enabled,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearEmailNotificationPreference = async () => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
