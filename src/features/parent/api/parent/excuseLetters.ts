import { apiFetch } from "../../../../shared/api/client";

type ExcuseLetterResponse = {
  success: boolean;
  message?: string;
  excuse_letter_id?: number;
};

export type ParentMessageHistoryItem = {
  id: string;
  parent_id: string;
  child_id: string;
  child_name: string;
  type: "excuse_letter" | "message";
  date_from: string | null;
  date_to: string | null;
  reason: string;
  custom_reason: string | null;
  message: string;
  teacher_response?: string | null;
  responded_at?: string | null;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  updated_at: string;
  teacher_ids: number[];
  teacher_names: string[];
};

export type ParentMessageHistoryResponse = {
  success: boolean;
  letters: ParentMessageHistoryItem[];
  pagination?: {
    page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
  };
};

type SubmitExcuseLetterPayload = {
  childId: string;
  teacherIds: string[];
  dateFrom: string;
  dateTo: string;
  reason: string;
  customReason?: string;
  message: string;
};

export const submitExcuseLetter = async (
  payload: SubmitExcuseLetterPayload
): Promise<ExcuseLetterResponse> => {
  return apiFetch<ExcuseLetterResponse>("/submit_excuse_letter", {
    method: "POST",
    body: JSON.stringify({
      child_id: payload.childId,
      teacher_ids: payload.teacherIds,
      date_from: payload.dateFrom,
      date_to: payload.dateTo,
      reason: payload.reason,
      custom_reason: payload.customReason || "",
      message: payload.message,
    }),
  });
};

export const fetchParentMessageHistory = async (
  options?: { childId?: string; page?: number; perPage?: number }
): Promise<ParentMessageHistoryResponse> => {
  const params = new URLSearchParams();
  if (options?.childId && options.childId !== "all") {
    params.set("child_id", options.childId);
  }
  if (options?.page) {
    params.set("page", String(options.page));
  }
  if (options?.perPage) {
    params.set("per_page", String(options.perPage));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ParentMessageHistoryResponse>(`/get_parent_message_history${suffix}`, {
    method: "GET",
  });
};
