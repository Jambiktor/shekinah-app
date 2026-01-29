import { apiFetch } from "../../../../shared/api/client";

type Teacher = {
  id: string;
  name: string;
  email: string;
  subject: string;
  card_image?: string | null;
  cardImage?: string | null;
  user_id?: string | number;
  userId?: string | number;
  user_meta?: {
    card_image?: string | null;
  };
};

type TeachersResponse = {
  success: boolean;
  message?: string;
  teachers: Teacher[];
};

export const fetchStudentTeachers = async (childId: string): Promise<TeachersResponse> => {
  return apiFetch<TeachersResponse>(`/get_student_teachers?child_id=${childId}`, {
    method: "GET",
  });
};
