import Constants from "expo-constants";

const manifest2 = Constants.manifest2 as { extra?: any } | null | undefined;
const manifest2Extra = manifest2?.extra;
const manifest2ClientExtra = manifest2Extra?.expoClient?.extra;

const extra =
  Constants.expoConfig?.extra ??
  manifest2ClientExtra ??
  manifest2Extra ??
  Constants.manifest?.extra ??
  {};

export const getEnvString = (key: string): string => {
  const value = process.env[key];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  const extraValue = extra[key as keyof typeof extra];
  return typeof extraValue === "string" ? extraValue : "";
};
