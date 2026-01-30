const dotenv = require("dotenv");

dotenv.config();

const appConfig = require("./app.json");

const readEnv = (key, fallback = "") => {
  const value = process.env[key];
  return value !== undefined ? value : fallback;
};

module.exports = () => {
  const expoConfig = appConfig.expo ?? {};

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
    },
  };
};
