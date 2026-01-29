import AsyncStorage from "@react-native-async-storage/async-storage";

import { TeacherStudent } from "../types";

export type AttendanceCacheRecord = {
  id: string;
  teacher_id: string;
  assigned_section: string;
  subject?: string;
  attendance: string;
  date_logged: string;
};

type QueueItem = {
  id: string;
};

const STORAGE_PREFIX = "shekinah_teacher_v1";

const buildKey = (...parts: string[]) =>
  [STORAGE_PREFIX, ...parts.map((part) => encodeURIComponent(part))].join(":");

const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    return null;
  }
};

const writeJson = async <T>(key: string, value: T): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getRosterCache = async (
  teacherId: string
): Promise<TeacherStudent[] | null> => {
  return readJson<TeacherStudent[]>(buildKey("roster", teacherId));
};

export const setRosterCache = async (
  teacherId: string,
  students: TeacherStudent[]
): Promise<void> => {
  await writeJson(buildKey("roster", teacherId), students);
};

export const clearRosterCache = async (teacherId: string): Promise<void> => {
  await AsyncStorage.removeItem(buildKey("roster", teacherId));
};

export const getAttendanceCacheForClass = async (
  teacherId: string,
  assignedSection: string
): Promise<AttendanceCacheRecord[] | null> => {
  return readJson<AttendanceCacheRecord[]>(
    buildKey("attendance", "class", teacherId, assignedSection)
  );
};

export const setAttendanceCacheForClass = async (
  teacherId: string,
  assignedSection: string,
  records: AttendanceCacheRecord[]
): Promise<void> => {
  await writeJson(
    buildKey("attendance", "class", teacherId, assignedSection),
    records
  );
};

export const getAttendanceCacheAll = async (
  teacherId: string
): Promise<AttendanceCacheRecord[] | null> => {
  return readJson<AttendanceCacheRecord[]>(buildKey("attendance", "all", teacherId));
};

export const setAttendanceCacheAll = async (
  teacherId: string,
  records: AttendanceCacheRecord[]
): Promise<void> => {
  await writeJson(buildKey("attendance", "all", teacherId), records);
};

export const getAttendanceQueue = async <T extends QueueItem>(): Promise<T[]> => {
  return (await readJson<T[]>(buildKey("attendance", "queue"))) ?? [];
};

export const enqueueAttendanceQueueItem = async <T extends QueueItem>(
  item: T
): Promise<void> => {
  const existing = await getAttendanceQueue<T>();
  await writeJson(buildKey("attendance", "queue"), [item, ...existing]);
};

export const removeAttendanceQueueItems = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) {
    return;
  }
  const existing = await getAttendanceQueue<QueueItem>();
  const next = existing.filter((item) => !ids.includes(item.id));
  await writeJson(buildKey("attendance", "queue"), next);
};
