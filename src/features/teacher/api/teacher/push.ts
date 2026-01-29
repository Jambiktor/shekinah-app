import { apiFetch } from "../../../../shared/api/client";

type ParentPushPayload = {
  title?: string;
  body?: string;
};

type ParentPushResponse = {
  success: boolean;
  message?: string;
  sent?: number;
  failed?: number;
  skipped?: number;
  sent_to?: {
    parent_id: number;
    parent_name: string;
    students?: string[];
  }[];
  failed_to?: {
    parent_id: number;
    parent_name: string;
  }[];
  parents?: {
    parent_id: number;
    parent_name: string;
    students?: string[];
  }[];
};

export const sendTeacherParentPush = async (
  payload: ParentPushPayload = {}
): Promise<ParentPushResponse> => {
  const response = await apiFetch<ParentPushResponse>("/send_teacher_parent_push", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success) {
    throw new Error(response.message || "Unable to send push notification.");
  }

  return response;
};
