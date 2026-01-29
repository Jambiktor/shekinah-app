import { Alert } from "react-native";
import { apiFetch } from "../../../../shared/api/client";

type BasicResponse = {
  success: boolean;
  message?: string;
};

type EmailPreferenceResponse = {
  success: boolean;
  enabled?: boolean;
  message?: string;
};

const buildFormBody = (entries: Array<[string, string]>) => {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return params.toString();
};

export const markEmailRead = async (emailId: string): Promise<BasicResponse> => {
  const body = buildFormBody([["email_id", emailId]]);
  return apiFetch<BasicResponse>("/mark_email_read", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
};

export const updateEmailNotifications = async (enabled: boolean): Promise<BasicResponse> => {
  const body = buildFormBody([["email_notifications_enabled", enabled ? "1" : "0"]]);
  return apiFetch<BasicResponse>("/update_email_notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
};

export const fetchEmailNotificationsPreference = async (): Promise<EmailPreferenceResponse> => {
  return apiFetch<EmailPreferenceResponse>("/get_email_notifications_preference", {
    method: "GET",
  });
};

export const registerPushToken = async (token: string): Promise<BasicResponse> => {
  const encodedToken = encodeURIComponent(token);
  const response = await apiFetch<BasicResponse>(
    `/register_push_token?token=${encodedToken}&debug=1`,
    {
    method: "POST",
    body: JSON.stringify({ token }),
    }
  );
  return response;
};

export const unregisterPushToken = async (token?: string): Promise<BasicResponse> => {
  const response = await apiFetch<BasicResponse>("/unregister_push_token", {
    method: "POST",
    body: JSON.stringify(token ? { token } : {}),
  });
  return response;
};
