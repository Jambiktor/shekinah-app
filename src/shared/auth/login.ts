import {
  apiFetch,
  getAccessToken,
  getSessionCookie,
  normalizeSessionCookie,
  setAccessToken,
  setSessionCookie,
} from "../api/client";
import { AuthProfile } from "../../types/auth";

type LoginPayload = {
  access_token?: string;
  expires_in?: number;
  session_cookie?: string;
  data?: {
    access_token?: string;
    expires_in?: number;
    user_id?: string | number;
    role?: string;
    name?: string;
    email?: string;
    session_cookie?: string;
    teacher_levels?: unknown[];
  };
};

const buildFormBody = (login: string, password: string) => {
  const params = new URLSearchParams();
  params.append("login", login);
  params.append("password", password);
  return params.toString();
};

const resolveAccessToken = (payload?: LoginPayload | null) => {
  const data = payload?.data;
  const accessToken = data?.access_token ?? payload?.access_token ?? null;
  if (typeof accessToken === "string" && accessToken.length > 0) {
    setAccessToken(accessToken);
  } else {
    setAccessToken(null);
  }

  if (!getSessionCookie()) {
    const fallbackCookie = data?.session_cookie ?? payload?.session_cookie ?? null;
    const normalizedCookie = normalizeSessionCookie(fallbackCookie);
    if (normalizedCookie) {
      setSessionCookie(normalizedCookie);
    }
  }

  return { data, accessToken };
};

export type LoginResult = {
  profile: AuthProfile;
  role: string;
  teacherLevels: unknown[];
};

export const loginWithRole = async (login: string, password: string): Promise<LoginResult> => {
  const body = buildFormBody(login, password);

  const payload = await apiFetch<LoginPayload>("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    clearSessionOnMissingCookie: true,
  });

  const { data } = resolveAccessToken(payload);

  if (!data?.user_id) {
    throw new Error("Login response missing user_id.");
  }

  const role = String(data.role || "").toLowerCase();
  if (role === "parent") {
    const inbox = await apiFetch<{ success: boolean; message?: string }>(
      "/get_parent_inbox",
      {
        method: "POST",
      }
    );

    if (!inbox.success) {
      throw new Error(inbox.message || "Unauthorized parent account.");
    }
  } else if (role !== "teacher" && role !== "developer") {
    throw new Error("Only parent, teacher, or developer accounts can log in here.");
  }

  const profile: AuthProfile = {
    id: String(data.user_id),
    name: data.name || login,
    email: data.email || login,
    role: data.role || role,
  };

  const teacherLevels =
    Array.isArray(data.teacher_levels) ? data.teacher_levels : Array.isArray((data as any)?.teacherLevels)
    ? (data as any).teacherLevels
    : [];

  return {
    profile,
    role,
    teacherLevels,
  };
};

export const readAuthTokens = () => ({
  sessionCookie: getSessionCookie(),
  accessToken: getAccessToken(),
});
