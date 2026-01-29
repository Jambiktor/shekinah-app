import { apiFetch } from "../../../../shared/api/client";
import { getEnvString } from "../../../../shared/config/env";
import {
  AttendanceCacheRecord,
  enqueueAttendanceQueueItem,
  getAttendanceCacheAll,
  getAttendanceCacheForClass,
  getAttendanceQueue,
  removeAttendanceQueueItems,
  setAttendanceCacheAll,
  setAttendanceCacheForClass,
} from "../../storage/offlineCache";

export type AttendanceStatus = "present" | "absent" | "late";

type AttendanceEntry = {
  studentId: string;
  status: AttendanceStatus;
};

type SubmitAttendancePayload = {
  assignmentId: string;
  teacherId: string;
  date?: string;
  attendanceId?: string;
  attendance: AttendanceEntry[];
};

type SubmitAttendanceResponse = {
  success: boolean;
  message: string;
  saved?: number;
  assigned_section?: string;
  assignment_id?: string;
  date?: string;
};

type AttendanceLogEntry = {
  status: AttendanceStatus;
  student_id: string;
};

type ClassAttendanceRecord = {
  id: string;
  teacher_id: string;
  assignment_id?: string;
  assigned_section?: string;
  section_name?: string;
  subject?: string;
  subject_name?: string;
  attendance: string;
  date_logged: string;
};

type GetAttendanceResponse = {
  success: boolean;
  message: string;
  data?: ClassAttendanceRecord[];
};

type QueueableAttendancePayload = SubmitAttendancePayload & {
  teacherId: string;
};

type AttendanceCacheMeta = {
  assignedSection: string;
  subject?: string;
};

type AttendanceQueueItem = {
  id: string;
  createdAt: string;
  mode: "submit" | "update";
  payload: QueueableAttendancePayload;
};

type SubmitAttendanceResult = SubmitAttendanceResponse & {
  queued?: boolean;
};

type SubmitAttendanceOptions = {
  forceUpdate?: boolean;
};

const isMissingAttendanceRecordError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no existing attendance record found/i.test(message);
};

const API_KEY = getEnvString("EXPO_PUBLIC_API_KEY");

const buildAttendancePath = (query?: Record<string, string>) => {
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

  return `/class_attendance?${params.toString()}`;
};

const buildGetAttendancePath = (query?: Record<string, string>) => {
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

  return `/get_class_attendance?${params.toString()}`;
};

export const submitClassAttendance = async (
  payload: SubmitAttendancePayload
): Promise<SubmitAttendanceResponse> => {
  const path = buildAttendancePath();
  if (!payload.assignmentId) {
    throw new Error("Missing assignment id for attendance submission.");
  }
  const params = new URLSearchParams();
  params.append("assignment_id", payload.assignmentId);
  params.append("teacher_id", payload.teacherId);
  if (payload.date) {
    params.append("date", payload.date);
  }
  params.append(
    "attendance",
    JSON.stringify(
      payload.attendance.map((entry) => ({
        student_id: entry.studentId,
        status: entry.status,
      }))
    )
  );

  return apiFetch<SubmitAttendanceResponse>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
};

export const updateClassAttendance = async (
  payload: SubmitAttendancePayload
): Promise<SubmitAttendanceResponse> => {
  const path = buildAttendancePath();
  if (!payload.assignmentId) {
    throw new Error("Missing assignment id for attendance update.");
  }
  const params = new URLSearchParams();
  params.append("assignment_id", payload.assignmentId);
  params.append("teacher_id", payload.teacherId);
  if (payload.date) {
    params.append("date", payload.date);
  }
  if (payload.attendanceId) {
    params.append("attendance_id", payload.attendanceId);
  }
  params.append(
    "attendance",
    JSON.stringify(
      payload.attendance.map((entry) => ({
        student_id: entry.studentId,
        status: entry.status,
      }))
    )
  );

  return apiFetch<SubmitAttendanceResponse>(path.replace("/class_attendance", "/update_class_attendance"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
};

const buildAttendanceRecordFromPayload = (
  payload: QueueableAttendancePayload,
  meta: AttendanceCacheMeta
): AttendanceCacheRecord => {
  const dateLogged = payload.date ? payload.date : new Date().toISOString();
  const attendance = payload.attendance.map((entry) => ({
    student_id: entry.studentId,
    status: entry.status,
  }));

  return {
    id: payload.attendanceId || `local-${Date.now()}`,
    teacher_id: payload.teacherId,
    assigned_section: meta.assignedSection,
    subject: meta.subject,
    attendance: JSON.stringify(attendance),
    date_logged: dateLogged,
  };
};

const upsertAttendanceRecord = (
  records: AttendanceCacheRecord[],
  record: AttendanceCacheRecord
) => {
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    const next = [...records];
    next[index] = record;
    return next;
  }
  return [record, ...records];
};

const cacheAttendanceRecord = async (
  payload: QueueableAttendancePayload,
  meta: AttendanceCacheMeta
): Promise<void> => {
  const record = buildAttendanceRecordFromPayload(payload, meta);
  const classRecords =
    (await getAttendanceCacheForClass(payload.teacherId, meta.assignedSection)) ?? [];
  const allRecords = (await getAttendanceCacheAll(payload.teacherId)) ?? [];

  await Promise.all([
    setAttendanceCacheForClass(
      payload.teacherId,
      meta.assignedSection,
      upsertAttendanceRecord(classRecords, record)
    ),
    setAttendanceCacheAll(
      payload.teacherId,
      upsertAttendanceRecord(allRecords, record)
    ),
  ]);
};

const buildQueueItem = (
  payload: QueueableAttendancePayload,
  mode: AttendanceQueueItem["mode"]
): AttendanceQueueItem => ({
  id: `queue-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  mode,
  payload,
});

export const submitAttendanceWithQueue = async (
  payload: QueueableAttendancePayload,
  meta: AttendanceCacheMeta,
  options: SubmitAttendanceOptions = {}
): Promise<SubmitAttendanceResult> => {
  try {
    if (options.forceUpdate || payload.attendanceId) {
      const response = await updateClassAttendance(payload);
      await cacheAttendanceRecord(payload, meta);
      return { ...response, queued: false };
    }

    try {
      const response = await updateClassAttendance(payload);
      await cacheAttendanceRecord(payload, meta);
      return { ...response, queued: false };
    } catch (error) {
      if (!isMissingAttendanceRecordError(error)) {
        throw error;
      }
    }

    const response = await submitClassAttendance(payload);
    await cacheAttendanceRecord(payload, meta);
    return { ...response, queued: false };
  } catch (error) {
    const mode: AttendanceQueueItem["mode"] =
      options.forceUpdate || payload.attendanceId ? "update" : "submit";
    const queueItem = buildQueueItem(payload, mode);
    await enqueueAttendanceQueueItem(queueItem);
    await cacheAttendanceRecord(payload, meta);
    return {
      success: true,
      message: "Saved locally. Will sync when online.",
      queued: true,
    };
  }
};

export const flushAttendanceQueue = async (): Promise<void> => {
  const queue = await getAttendanceQueue<AttendanceQueueItem>();
  if (queue.length === 0) {
    return;
  }

  const succeededIds: string[] = [];
  for (const item of queue) {
    try {
      if (item.mode === "update") {
        await updateClassAttendance(item.payload);
      } else {
        await submitClassAttendance(item.payload);
      }
      succeededIds.push(item.id);
    } catch (error) {
      break;
    }
  }

  await removeAttendanceQueueItems(succeededIds);
};

export const getClassAttendance = async (
  teacherId: string,
  assignedSection: string,
  assignmentId?: string
): Promise<GetAttendanceResponse> => {
  const path = buildGetAttendancePath();
  const params = new URLSearchParams();
  params.append("teacher_id", teacherId);
  params.append("assigned_section", assignedSection);
  if (assignmentId) {
    params.append("assignment_id", assignmentId);
  }
  try {
    const response = await apiFetch<GetAttendanceResponse>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const records = response.data ?? [];
    await setAttendanceCacheForClass(teacherId, assignedSection, records);
    return response;
  } catch (error) {
    const cached = await getAttendanceCacheForClass(teacherId, assignedSection);
    if (cached && cached.length > 0) {
      return {
        success: true,
        message: "Loaded cached attendance.",
        data: cached,
      };
    }
    throw error;
  }
};

export const getAllClassAttendance = async (
  teacherId: string
): Promise<GetAttendanceResponse> => {
  const path = buildGetAttendancePath();
  const params = new URLSearchParams();
  params.append("teacher_id", teacherId);
  try {
    const response = await apiFetch<GetAttendanceResponse>(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const records = response.data ?? [];
    await setAttendanceCacheAll(teacherId, records);
    return response;
  } catch (error) {
    const cached = await getAttendanceCacheAll(teacherId);
    if (cached && cached.length > 0) {
      return {
        success: true,
        message: "Loaded cached attendance.",
        data: cached,
      };
    }
    throw error;
  }
};

export type { AttendanceLogEntry, ClassAttendanceRecord, GetAttendanceResponse };
