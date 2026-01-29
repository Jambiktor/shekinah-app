import { apiFetch } from "../../../../shared/api/client";
import { TeacherStudent } from "../../types";
import { getRosterCache, setRosterCache } from "../../storage/offlineCache";

type TeacherSectionSubjectStudentsResponse = {
  success?: boolean;
  data?: {
    assignment_id?: number;
    section?: {
      id?: number;
      name?: string;
      school_year?: string;
      term?: string;
    };
    subject?: {
      id?: number;
      name?: string;
      time?: string;
    };
    students?: {
      id?: number;
      name?: string;
      student_id_number?: string;
      card_number?: string;
      card_image?: string | null;
      cardImage?: string | null;
      gender?: string;
      sex?: string;
      parent_contact_number?: string | null;
      parent_mobile?: string | null;
    }[];
  }[];
  message?: string;
};

export const fetchTeacherStudents = async (
  teacherId: string
): Promise<TeacherStudent[]> => {
  try {
    const response = await apiFetch<TeacherSectionSubjectStudentsResponse>(
      "/get_teacher_section_subject_students"
    );

    if (response.success === false) {
      throw new Error(response.message || "Unable to load students.");
    }

    const assignments = Array.isArray(response.data) ? response.data : [];
    const students = assignments.flatMap((assignment) => {
      const assignedSection = String(assignment.section?.name || "").trim();
      const subject = String(assignment.subject?.name || "").trim();
      const assignmentId = String(assignment.assignment_id ?? "").trim();
      const subjectTime = String(assignment.subject?.time || "").trim();
      const roster = Array.isArray(assignment.students) ? assignment.students : [];

      return roster.map((student) => ({
        id: String(student.id ?? ""),
        fullName: String(student.name || "").trim(),
        cardNumber:
          String(student.card_number || student.student_id_number || "")
            .trim()
            .replace(/^N\/A$/i, "") || "",
        cardImage: student.card_image ?? student.cardImage ?? null,
        gender: student.gender ?? student.sex ?? null,
        parentMobile: String(
          student.parent_mobile || student.parent_contact_number || ""
        ).trim(),
        assignedSection,
        subject,
        subjectTime,
        assignmentId: assignmentId || undefined,
      }));
    });

    await setRosterCache(teacherId, students);
    return students;
  } catch (error) {
    const cached = await getRosterCache(teacherId);
    if (cached && cached.length > 0) {
      return cached;
    }
    throw error;
  }
};
