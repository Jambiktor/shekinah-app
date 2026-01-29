import { apiFetch } from "../../../../shared/api/client";

export type ExcuseLetterStatus = "pending" | "approved" | "rejected";

export type ExcuseLetterType = "excuse_letter" | "message";

export type TeacherExcuseLetter = {
  id: string;
  parent_id: string;
  child_id: string;
  type: ExcuseLetterType;
  date_from: string;
  date_to: string;
  reason: string;
  custom_reason: string | null;
  message: string;
  teacher_response?: string | null;
  responded_at?: string | null;
  status: ExcuseLetterStatus;
  submitted_at: string;
  updated_at: string;
  ack_status: "pending" | "acknowledged";
  acknowledged_at: string | null;
  parent_name: string;
  child_name: string;
};

export type TeacherExcuseLettersResponse = {
  success: boolean;
  letters: TeacherExcuseLetter[];
};

export const fetchTeacherExcuseLetters = async (): Promise<TeacherExcuseLettersResponse> => {
  return apiFetch<TeacherExcuseLettersResponse>("/get_teacher_excuse_letters", {
    method: "GET",
  });
};

type UpdateExcuseLetterResponse = {
  success: boolean;
  message?: string;
  status?: ExcuseLetterStatus;
};

export const updateExcuseLetterStatus = async (
  excuseLetterId: string,
  status: Exclude<ExcuseLetterStatus, "pending">
): Promise<UpdateExcuseLetterResponse> => {
  return apiFetch<UpdateExcuseLetterResponse>("/update_excuse_letter_status", {
    method: "POST",
    body: JSON.stringify({
      excuse_letter_id: excuseLetterId,
      status,
    }),
  });
};

export const sendExcuseLetterStatusNotification = async (
  excuseLetterId: string,
  status: Exclude<ExcuseLetterStatus, "pending">
): Promise<UpdateExcuseLetterResponse> => {
  return apiFetch<UpdateExcuseLetterResponse>("/send_excuse_letter_status_notification", {
    method: "POST",
    body: JSON.stringify({
      excuse_letter_id: excuseLetterId,
      status,
    }),
  });
};

type SendTeacherMessageReplyResponse = {
  success: boolean;
  message?: string;
};

export const sendTeacherMessageReply = async (
  excuseLetterId: string,
  replyMessage: string
): Promise<SendTeacherMessageReplyResponse> => {
  return apiFetch<SendTeacherMessageReplyResponse>("/send_teacher_message_reply", {
    method: "POST",
    body: JSON.stringify({
      excuse_letter_id: excuseLetterId,
      message: replyMessage,
    }),
  });
};
