import { apiFetch } from "../api/client";
import { getEnvString } from "../config/env";
import { makeApiCacheKey } from "../storage/apiCache";
import { DEFAULT_THEME } from "./defaultTheme";
import { SchoolThemeResponse, ThemeRequestParams } from "./types";

const API_KEY = getEnvString("EXPO_PUBLIC_API_KEY");

const buildThemePath = ({ school, module, app }: ThemeRequestParams = {}) => {
  if (!API_KEY) {
    throw new Error("EXPO_PUBLIC_API_KEY is not set.");
  }

  const params = new URLSearchParams({ api_key: API_KEY });
  if (school) params.set("school", school);
  if (module) params.set("module", module);
  if (app) params.set("app", app);

  // API base already ends with /admin/api, so avoid duplicating the segment.
  return `/get_school_theme?${params.toString()}`;
};

const normalizeTheme = (theme: SchoolThemeResponse | null): SchoolThemeResponse => {
  if (!theme) {
    return DEFAULT_THEME;
  }
  return {
    ...DEFAULT_THEME,
    ...theme,
    colors: {
      ...DEFAULT_THEME.colors,
      ...(theme.colors ?? {}),
    },
  };
};

const buildCacheKey = (params: ThemeRequestParams = {}) =>
  makeApiCacheKey({
    path: "/get_school_theme",
    school: params.school ?? "default",
    module: params.module ?? params.app ?? "default",
  });

export const fetchSchoolTheme = async (
  params: ThemeRequestParams = {}
): Promise<SchoolThemeResponse> => {
  const cacheKey = buildCacheKey(params);
  const raw = await apiFetch<any>(buildThemePath(params), {
    cache: {
      mode: "stale-if-error",
      ttlMs: 24 * 60 * 60 * 1000,
      key: cacheKey,
    },
  });
  const theme = raw && raw.success === true && raw.data ? raw.data : raw;
  return normalizeTheme(theme as SchoolThemeResponse);
};

export const getDefaultTheme = () => DEFAULT_THEME;
