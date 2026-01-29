import {
  getCachedResponse,
  hashSensitiveValue,
  makeApiCacheKey,
  setCachedResponse,
} from "../storage/apiCache";
import { getEnvString } from "../config/env";

type ApiError = {
  message: string;
  status: number;
};

const API_BASE_URL = getEnvString("EXPO_PUBLIC_API_BASE_URL");
const API_KEY = getEnvString("EXPO_PUBLIC_API_KEY");

const buildUrl = (path: string) => {
  const base = API_BASE_URL.replace(/\/$/, "");
  const suffix = path.replace(/^\//, "");
  return `${base}/${suffix}`;
};

let sessionCookie: string | null = null;
let accessToken: string | null = null;

export const parseSetCookieHeader = (setCookie: string | null) => {
  if (!setCookie) {
    return null;
  }

  const matches: string[] = [];
  const pattern = /(?:^|,\s*)([^=;,]+=[^;]+)/g;
  let match = pattern.exec(setCookie);
  while (match) {
    matches.push(match[1]);
    match = pattern.exec(setCookie);
  }

  return matches[0] || null;
};

export const normalizeSessionCookie = (cookie: string | null) => {
  if (!cookie) {
    return null;
  }
  return parseSetCookieHeader(cookie) || null;
};

export const setSessionCookie = (cookie: string | null) => {
  sessionCookie = cookie;
};

export const getSessionCookie = () => sessionCookie;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

type CacheMode = "no-store" | "stale-if-error" | "force-cache";

type ApiFetchOptions = RequestInit & {
  token?: string;
  clearSessionOnMissingCookie?: boolean;
  cache?: {
    mode?: CacheMode;
    ttlMs?: number;
    key?: string;
  };
};

export const apiFetch = async <T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
  }

  const {
    token,
    headers,
    clearSessionOnMissingCookie = false,
    cache,
    ...rest
  } = options;
  const effectiveToken = token ?? accessToken;
  const url = buildUrl(path);
  const requestHeaders = {
    "Content-Type": "application/json",
    ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
    ...(sessionCookie ? { Cookie: sessionCookie } : {}),
    ...headers,
  };

  const cacheMode: CacheMode = cache?.mode ?? "no-store";
  const cacheTtlMs = cache?.ttlMs ?? 0;
  const cacheKey =
    cacheMode === "no-store"
      ? null
      : cache?.key ??
        makeApiCacheKey({
          url,
          method: rest.method ?? "GET",
          body: rest.body ?? null,
          token: hashSensitiveValue(effectiveToken),
          session: hashSensitiveValue(sessionCookie),
        });

  if (cacheMode === "force-cache" && cacheKey) {
    const cached = await getCachedResponse<T>(cacheKey);
    if (cached) {
      return cached.data;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
    });
  } catch (error) {
    if (cacheMode === "stale-if-error" && cacheKey) {
      const cached = await getCachedResponse<T>(cacheKey);
      if (cached) {
        return cached.data;
      }
    }
    throw error;
  }

  const updatedCookie = parseSetCookieHeader(response.headers.get("set-cookie"));
  if (updatedCookie) {
    sessionCookie = updatedCookie;
  } else if (clearSessionOnMissingCookie) {
    sessionCookie = null;
  }

  const raw = await response.text().catch(() => "");
  const contentType = response.headers.get("content-type") || "";
  const contentTypeIsJson = /application\/json/i.test(contentType) || /\+json/i.test(contentType);
  const trimmed = raw.trimStart();
  let data: any = {};
  let parsedOk = false;
  if (raw) {
    try {
      data = JSON.parse(raw);
      parsedOk = true;
    } catch {
      data = {};
    }
  }

  const looksLikeHtmlDoc = /^<!doctype html|^<html/i.test(trimmed);
  const isHtmlResponse =
    /text\/html/i.test(contentType) || (!contentTypeIsJson && !parsedOk && looksLikeHtmlDoc);

  if (!response.ok || isHtmlResponse) {
    const fallback = isHtmlResponse
      ? `Unexpected HTML response from API (status ${response.status}).`
      : raw || `Request failed with status ${response.status}.`;
    const message = data?.message || fallback;
    const error: ApiError = { message, status: response.status };
    throw new Error(error.message);
  }

  if (cacheMode !== "no-store" && cacheKey) {
    await setCachedResponse(cacheKey, data as T, cacheTtlMs);
  }

  return data as T;
};