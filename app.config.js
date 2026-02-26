try {
  require("dotenv").config();
} catch {
  // `dotenv` can be missing in production-only installs during EAS local builds.
}

const readEnv = (key, fallback = "") => {
  const value = process.env[key];
  return value !== undefined ? value : fallback;
};

module.exports = ({ config }) => {
  const expoConfig = config ?? {};

  return {
    ...expoConfig,
    owner: expoConfig.owner ?? "eunikaagency",
    extra: {
      eas: expoConfig.extra?.eas ?? {},
      ...expoConfig.extra,
      EXPO_PUBLIC_API_BASE_URL: readEnv(
        "EXPO_PUBLIC_API_BASE_URL",
        expoConfig.extra?.EXPO_PUBLIC_API_BASE_URL
      ),
      EXPO_PUBLIC_API_KEY: readEnv("EXPO_PUBLIC_API_KEY", expoConfig.extra?.EXPO_PUBLIC_API_KEY),
      EXPO_PUBLIC_API_DEBUG: readEnv(
        "EXPO_PUBLIC_API_DEBUG",
        expoConfig.extra?.EXPO_PUBLIC_API_DEBUG
      ),
      EXPO_PUBLIC_SOCKET_IO_URL: readEnv(
        "EXPO_PUBLIC_SOCKET_IO_URL",
        expoConfig.extra?.EXPO_PUBLIC_SOCKET_IO_URL
      ),
      EXPO_PUBLIC_KIOSK_ID: readEnv(
        "EXPO_PUBLIC_KIOSK_ID",
        expoConfig.extra?.EXPO_PUBLIC_KIOSK_ID
      ),
      EXPO_PUBLIC_KIOSK_API_KEY: readEnv(
        "EXPO_PUBLIC_KIOSK_API_KEY",
        expoConfig.extra?.EXPO_PUBLIC_KIOSK_API_KEY
      ),
      EXPO_PUBLIC_KIOSK_EVENTS_PATH: readEnv(
        "EXPO_PUBLIC_KIOSK_EVENTS_PATH",
        expoConfig.extra?.EXPO_PUBLIC_KIOSK_EVENTS_PATH
      ),
      EXPO_PUBLIC_SCHOOL_SLUG: readEnv(
        "EXPO_PUBLIC_SCHOOL_SLUG",
        expoConfig.extra?.EXPO_PUBLIC_SCHOOL_SLUG
      ),
    },
  };
};
