import { apiFetch } from "../../../../shared/api/client";
import { Child, LogEntry, Notification, ReportStats } from "../../types";
import { buildLogsFormBody, mapAttendanceLogs, mapNotifications } from "../../helpers/logs";
import { createEmptyReportStats } from "../../../../shared/helpers/reports";

type InboxResponse = {
  success: boolean;
  emails?: {
    id: number | string;
    student_id?: number | string | null;
    email: string;
    subject: string;
    email_message: string;
    status: string;
    read_status: string | null;
    datetime_send: string;
  }[];
  data?: {
    emails?: {
      id: number | string;
      student_id?: number | string | null;
      email: string;
      subject: string;
      email_message: string;
      status: string;
      read_status: string | null;
      datetime_send: string;
    }[];
  };
  message?: string;
};

type Select2Response = {
  results: {
    id: number | string;
    text: string;
  }[];
};

type LogsResponse = {
  data: Array<[string, string, string, string, string, string]>;
};

type ReportsResponse = {
  success: boolean;
  children: {
    id: number | string;
    full_name: string;
    email: string;
    student_id: string;
    grade: string;
    last_log: string | null;
    last_log_at: string | null;
    monthly_logs: number | string;
    monthly_in: number | string;
    monthly_out: number | string;
    present_days: number | string;
  }[];
  summary: {
    total_children: number | string;
    monthly_log_count: number | string;
    total_present_days: number | string;
    last_update: string | null;
  };
  message?: string;
};

const stripChildId = (label: string) => {
  return label.replace(/\s*\(ID:\s*[^)]+\)\s*/gi, "").trim();
};

export const fetchTeacherDashboard = async (): Promise<{
  notifications: Notification[];
  logs: LogEntry[];
  children: Child[];
  reports: ReportStats;
}> => {
  const inbox = await apiFetch<InboxResponse>("/get_teacher_inbox", {
    method: "POST",
  });

  if (!inbox.success) {
    throw new Error(inbox.message || "Unauthorized access.");
  }

  const inboxEmails = Array.isArray(inbox.emails)
    ? inbox.emails
    : Array.isArray(inbox.data?.emails)
    ? inbox.data?.emails
    : [];
  const notifications = mapNotifications(inboxEmails);

  const [childrenResult, reportsResult] = await Promise.allSettled([
    apiFetch<Select2Response>("/get_teacher_students_list", {
      method: "GET",
    }),
    apiFetch<ReportsResponse>("/get_children_report_data", {
      method: "POST",
    }),
  ]);

  const children: Child[] =
    childrenResult.status === "fulfilled"
      ? (childrenResult.value.results || []).map((child) => ({
          id: String(child.id),
          name: stripChildId(child.text),
        }))
      : [];

  let reports = createEmptyReportStats();
  if (reportsResult.status === "fulfilled") {
    try {
      reports = mapReportStats(reportsResult.value);
    } catch (error) {
      reports = createEmptyReportStats();
    }
  }

  let logs: LogEntry[] = [];
  try {
    logs = await fetchLogsForChildren(children);
  } catch (error) {
    logs = [];
  }

  return { notifications, logs, children, reports };
};

const fetchLogsForChildren = async (children: Child[]): Promise<LogEntry[]> => {
  if (children.length === 0) {
    return [];
  }

  const page = 1;
  const perPage = 25;

  const logRequests = children.map(async (child) => {
    const response = await apiFetch<LogsResponse>(
      `/get_student_attendance_logs/${child.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: buildLogsFormBody({ page, perPage }),
      }
    );

    return mapAttendanceLogs(response.data || [], child);
  });

  const logGroups = await Promise.all(logRequests);
  return logGroups.flat();
};

const normalizeNumber = (value: number | string | null | undefined): number => {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const mapReportStats = (response: ReportsResponse): ReportStats => {
  if (!response.success) {
    throw new Error(response.message || "Unable to load report data.");
  }

  return {
    children: (response.children || []).map((child) => ({
      id: String(child.id),
      fullName: child.full_name?.trim() || "Unknown Student",
      email: child.email || "",
      studentId: child.student_id || "N/A",
      grade: child.grade || "N/A",
      lastLog: child.last_log ?? null,
      lastLogAt: child.last_log_at ?? null,
      monthlyLogs: normalizeNumber(child.monthly_logs),
      monthlyIn: normalizeNumber(child.monthly_in),
      monthlyOut: normalizeNumber(child.monthly_out),
      presentDays: normalizeNumber(child.present_days),
    })),
    summary: {
      totalChildren: normalizeNumber(response.summary?.total_children),
      monthlyLogCount: normalizeNumber(response.summary?.monthly_log_count),
      totalPresentDays: normalizeNumber(response.summary?.total_present_days),
      lastUpdate: response.summary?.last_update ?? null,
    },
  };
};

