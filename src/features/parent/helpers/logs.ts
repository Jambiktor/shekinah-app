import { Child, LogEntry, Notification } from "../types";
import { stripHtml } from "../../../shared/helpers/text";

const parseLogType = (value: string) => {
  const normalized = stripHtml(value).toUpperCase();
  if (normalized.includes("ABSENT")) {
    return "ABSENT" as const;
  }
  if (normalized.includes("IN")) {
    return "IN" as const;
  }
  if (normalized.includes("OUT")) {
    return "OUT" as const;
  }
  return "IN" as const;
};

const parseDateLogged = (date: string, time: string) => {
  const fallback = `${date} ${time}`.trim();
  const direct = new Date(fallback);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const dateMatch = date.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  const timeMatch = time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);

  if (!dateMatch || !timeMatch) {
    const namedDateMatch = date.match(
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})$/i
    );
    if (!namedDateMatch || !timeMatch) {
      return fallback;
    }

    const monthIndexMap: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };

    const monthKey = namedDateMatch[1].toLowerCase();
    const monthIndex = monthIndexMap[monthKey];
    if (monthIndex === undefined) {
      return fallback;
    }

    const day = Number(namedDateMatch[2]);
    const year = Number(namedDateMatch[3]);

    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const second = Number(timeMatch[3] ?? "0");
    const meridian = timeMatch[4]?.toUpperCase();

    if (meridian === "PM" && hour < 12) {
      hour += 12;
    }
    if (meridian === "AM" && hour === 12) {
      hour = 0;
    }

    const parsedNamed = new Date(year, monthIndex, day, hour, minute, second);
    if (Number.isNaN(parsedNamed.getTime())) {
      return fallback;
    }
    return parsedNamed.toISOString();
  }

  const [, part1, part2, part3] = dateMatch;
  let year: number;
  let month: number;
  let day: number;

  if (part1.length === 4) {
    year = Number(part1);
    month = Number(part2);
    day = Number(part3);
  } else if (part3.length === 4) {
    year = Number(part3);
    month = Number(part2);
    day = Number(part1);
  } else {
    return fallback;
  }

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  const meridian = timeMatch[4]?.toUpperCase();

  if (meridian === "PM" && hour < 12) {
    hour += 12;
  }
  if (meridian === "AM" && hour === 12) {
    hour = 0;
  }

  const parsed = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
};

type LogsFormOptions = {
  page?: number;
  perPage?: number;
  includeAbsent?: boolean;
};

const normalizePerPage = (value: number | undefined, fallback: number) => {
  if (!value || value < 1) {
    return fallback;
  }
  if (value > 100) {
    return 100;
  }
  return value;
};

export const buildLogsFormBody = (options: LogsFormOptions = {}) => {
  const params = new URLSearchParams();
  const page = options.page && options.page > 0 ? options.page : 1;
  const perPage = normalizePerPage(options.perPage, 20);
  const start = (page - 1) * perPage;

  params.append("draw", "1");
  params.append("start", String(start));
  params.append("length", String(perPage));
  params.append("page", String(page));
  params.append("per_page", String(perPage));
  params.append("search[value]", "");
  params.append("order[0][column]", "1");
  params.append("order[0][dir]", "desc");
  if (options.includeAbsent) {
    params.append("include_absent", "1");
  }
  return params.toString();
};

export const mapNotifications = (
  emails: Array<{
    id: number | string;
    email: string;
    subject: string;
    email_message: string;
    status: string;
    read_status: string | null;
    datetime_send: string;
  }>
): Notification[] => {
  return emails.map((email) => ({
    id: String(email.id),
    email: email.email,
    subject: email.subject,
    emailMessage: email.email_message,
    status: email.status === "sent" ? "sent" : "not_sent",
    readStatus: email.read_status === "read" ? "read" : "unread",
    datetimeSend: email.datetime_send,
  }));
};

export const mapAttendanceLogs = (
  rows: Array<[string, string, string, string, string, string]>,
  child: Child
): LogEntry[] => {
  return rows.map((row) => {
    const [id, date, time, badge, status, location] = row;
    const logType = parseLogType(`${badge} ${status}`);
    const cleanedLocation = stripHtml(location ?? "").trim();

    return {
      id: String(id),
      childId: child.id,
      childName: child.name,
      logType,
      dateLogged: parseDateLogged(date, time),
      location: cleanedLocation.length > 0 ? cleanedLocation : undefined,
    };
  });
};
