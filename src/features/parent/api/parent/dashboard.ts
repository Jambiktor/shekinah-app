import { apiFetch } from "../../../../shared/api/client";
import { Child, LogEntry, Notification, ReportStats } from "../../types";
import { buildLogsFormBody, mapAttendanceLogs, mapNotifications } from "../../helpers/logs";

type InboxResponse = {
  success: boolean;
  emails: {
    id: number | string;
    email: string;
    subject: string;
    email_message: string;
    status: string;
    read_status: string | null;
    datetime_send: string;
  }[];
  message?: string;
};

type Select2Response = {
  results: {
    id: number | string;
    text: string;
    card_image?: string | null;
    assigned_section?: string | null;
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
    mobile?: string | null;
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

export const fetchParentDashboard = async (): Promise<{
  notifications: Notification[];
  logs: LogEntry[];
  children: Child[];
  reports: ReportStats;
}> => {
  const cacheTtlMs = 1000 * 60 * 60 * 24;

  const inbox = await apiFetch<InboxResponse>("/get_parent_inbox", {
    method: "POST",
    cache: {
      mode: "stale-if-error",
      ttlMs: cacheTtlMs,
    },
  });
  // console.log("Parent dashboard /get_parent_inbox response", inbox);

  if (!inbox.success) {
    throw new Error(inbox.message || "Unauthorized access.");
  }

  const notifications = mapNotifications(inbox.emails || []);

  const [childrenResponse, reportsResponse] = await Promise.all([
    apiFetch<Select2Response>("/get_teacher_students_list", {
      method: "GET",
      cache: {
        mode: "stale-if-error",
        ttlMs: cacheTtlMs,
      },
    }),
    apiFetch<ReportsResponse>("/get_children_report_data", {
      method: "POST",
      cache: {
        mode: "stale-if-error",
        ttlMs: cacheTtlMs,
      },
    }),
  ]);
  // console.log("Parent dashboard /get_teacher_students_list response", childrenResponse);
  // console.log("Parent dashboard /get_children_report_data response", reportsResponse);

  const children: Child[] = (childrenResponse.results || []).map((child) => ({
    id: String(child.id),
    name: stripChildId(child.text),
    cardImage: child.card_image ?? null,
    assignedSection: child.assigned_section ?? null,
  }));

  const logs = await fetchLogsForChildren(children);
  const reports = mapReportStats(reportsResponse, children);

  return { notifications, logs, children, reports };
};

const fetchLogsForChildren = async (children: Child[]): Promise<LogEntry[]> => {
  if (children.length === 0) {
    return [];
  }

  const page = 1;
  const perPage = 25;
  const cacheTtlMs = 1000 * 60 * 60 * 24;

  const logRequests = children.map(async (child) => {
    const response = await apiFetch<LogsResponse>(
      `/get_student_attendance_logs/${child.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: buildLogsFormBody({ page, perPage, includeAbsent: true }),
        cache: {
          mode: "stale-if-error",
          ttlMs: cacheTtlMs,
        },
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

const mapReportStats = (response: ReportsResponse, children: Child[]): ReportStats => {
  if (!response.success) {
    throw new Error(response.message || "Unable to load report data.");
  }

  const childLookup = new Map(
    children.map((child) => [
      child.id,
      {
        name: child.name,
        cardImage: child.cardImage ?? null,
        assignedSection: child.assignedSection ?? null,
      },
    ])
  );

  return {
    children: (response.children || []).map((child) => ({
      id: String(child.id),
      fullName:
        child.full_name?.trim() ||
        childLookup.get(String(child.id))?.name ||
        "Unknown Student",
      email: child.email || "",
      phone: child.mobile ?? "",
      studentId: child.student_id || "N/A",
      grade: child.grade || "N/A",
      lastLog: child.last_log ?? null,
      lastLogAt: child.last_log_at ?? null,
      monthlyLogs: normalizeNumber(child.monthly_logs),
      monthlyIn: normalizeNumber(child.monthly_in),
      monthlyOut: normalizeNumber(child.monthly_out),
      presentDays: normalizeNumber(child.present_days),
      cardImage: childLookup.get(String(child.id))?.cardImage ?? null,
      assignedSection: childLookup.get(String(child.id))?.assignedSection ?? null,
    })),
    summary: {
      totalChildren: normalizeNumber(response.summary?.total_children),
      monthlyLogCount: normalizeNumber(response.summary?.monthly_log_count),
      totalPresentDays: normalizeNumber(response.summary?.total_present_days),
      lastUpdate: response.summary?.last_update ?? null,
    },
  };
};
