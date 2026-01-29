import { apiFetch } from "../../../../shared/api/client";

export type AnnouncementStudent = {
  id: string;
  name: string;
  parentName: string;
};

type AnnouncementStudentsResponse = {
  success: boolean;
  students: {
    id: number | string;
    name: string;
    parent_name?: string | null;
  }[];
  message?: string;
};

export const fetchAnnouncementStudents = async (): Promise<AnnouncementStudent[]> => {
  const response = await apiFetch<AnnouncementStudentsResponse>("/get_teacher_announcement_students", {
    method: "GET",
  });

  if (!response.success) {
    throw new Error(response.message || "Unable to load students.");
  }

  const students = Array.isArray(response.students) ? response.students : [];
  return students.map((student) => ({
    id: String(student.id),
    name: String(student.name || "").trim(),
    parentName: String(student.parent_name || "").trim(),
  }));
};

type SendAnnouncementPayload = {
  message: string;
  recipients: "all" | "individual";
  student_ids?: number[];
  subject?: string;
};

type SendAnnouncementResponse = {
  success: boolean;
  sent?: number;
  skipped?: number;
  message?: string;
};

export const sendTeacherAnnouncement = async (
  payload: SendAnnouncementPayload
): Promise<SendAnnouncementResponse> => {
  const response = await apiFetch<SendAnnouncementResponse>("/send_teacher_announcement", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.success) {
    throw new Error(response.message || "Unable to send announcement.");
  }

  return response;
};
