import { apiFetch } from "../../../../shared/api/client";
import { getEnvString } from "../../../../shared/config/env";

type ApiStudentNote = {
  id: string;
  student_id: string;
  teacher_id: string;
  title?: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

type GetStudentNotesResponse = {
  success: boolean;
  message: string;
  data?: ApiStudentNote[];
};

type SaveStudentNoteResponse = {
  success: boolean;
  message: string;
  data?: ApiStudentNote;
};

type DeleteStudentNoteResponse = {
  success: boolean;
  message: string;
};

type SaveStudentNotePayload = {
  teacherId: string;
  studentId: string;
  note: string;
  title?: string;
  noteId?: string;
};

type DeleteStudentNotePayload = {
  teacherId: string;
  studentId: string;
  noteId: string;
};

const API_KEY = getEnvString("EXPO_PUBLIC_API_KEY");

const buildPath = (endpoint: string, query?: Record<string, string>) => {
  if (!API_KEY) {
    throw new Error("EXPO_PUBLIC_API_KEY is not set.");
  }

  const params = new URLSearchParams({ api_key: API_KEY });
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== "") {
        params.set(key, value);
      }
    });
  }

  return `/${endpoint}?${params.toString()}`;
};

export const getStudentNotes = async (
  teacherId: string,
  studentId: string
): Promise<GetStudentNotesResponse> => {
  const path = buildPath("get_student_notes", {
    teacher_id: teacherId,
    student_id: studentId,
  });

  return apiFetch<GetStudentNotesResponse>(path, {
    method: "GET",
  });
};

export const saveStudentNote = async (
  payload: SaveStudentNotePayload
): Promise<SaveStudentNoteResponse> => {
  const path = buildPath("save_student_note");
  const params = new URLSearchParams();
  params.append("teacher_id", payload.teacherId);
  params.append("student_id", payload.studentId);
  params.append("note", payload.note);
  if (payload.title) {
    params.append("title", payload.title);
  }
  if (payload.noteId) {
    params.append("note_id", payload.noteId);
  }

  return apiFetch<SaveStudentNoteResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
};

export const deleteStudentNote = async (
  payload: DeleteStudentNotePayload
): Promise<DeleteStudentNoteResponse> => {
  const path = buildPath("delete_student_note");
  const params = new URLSearchParams();
  params.append("teacher_id", payload.teacherId);
  params.append("student_id", payload.studentId);
  params.append("note_id", payload.noteId);

  return apiFetch<DeleteStudentNoteResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
};

export type { ApiStudentNote };
