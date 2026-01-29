import { ReportStats as ReportStatsBase } from "../../../types/reports";

export type ScreenKey = "home";

export type EmailStatus = "sent" | "not_sent";

export type ReadStatus = "read" | "unread";

export type Notification = {
  id: string;
  studentId?: string;
  subject: string;
  email: string;
  status: EmailStatus;
  readStatus: ReadStatus;
  datetimeSend: string;
  emailMessage: string;
};

export type LogStatus = "IN" | "OUT";

export type LogEntry = {
  id: string;
  childId: string;
  childName: string;
  logType: LogStatus;
  dateLogged: string;
  location?: string;
};

export type ReportChild = {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  grade: string;
  lastLog: string | null;
  lastLogAt: string | null;
  monthlyLogs: number;
  monthlyIn: number;
  monthlyOut: number;
  presentDays: number;
};

export type ReportStats = ReportStatsBase<ReportChild>;

export type Child = {
  id: string;
  name: string;
};

export type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type TeacherLevel = {
  levelId: string;
  levelName: string;
  section: string;
  educationType: string;
};

export type TeacherStudent = {
  id: string;
  fullName: string;
  assignedSection: string;
  subject: string;
  subjectTime: string;
  cardNumber?: string;
  assignmentId?: string;
  cardImage?: string | null;
  gender?: string | null;
  parentMobile?: string;
};
