import { ReportStats as ReportStatsBase } from "../../../types/reports";

export type ScreenKey =
  | "dashboard"
  | "inbox"
  | "message"
  | "logs"
  | "excuse-letter"
  | "settings";

export type EmailStatus = "sent" | "not_sent";

export type ReadStatus = "read" | "unread";

export type Notification = {
  id: string;
  subject: string;
  email: string;
  status: EmailStatus;
  readStatus: ReadStatus;
  datetimeSend: string;
  emailMessage: string;
};

export type LogStatus = "IN" | "OUT" | "ABSENT";

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
  phone?: string;
  studentId: string;
  grade: string;
  lastLog: string | null;
  lastLogAt: string | null;
  monthlyLogs: number;
  monthlyIn: number;
  monthlyOut: number;
  presentDays: number;
  cardImage?: string | null;
  assignedSection?: string | null;
};

export type ReportStats = ReportStatsBase<ReportChild>;

export type Child = {
  id: string;
  name: string;
  cardImage?: string | null;
  assignedSection?: string | null;
};

export type ParentProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};
