import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ClassAttendanceRecord, getAllClassAttendance } from "../api/teacher/attendance";
import { TeacherStudent } from "../types";
import SkeletonBlock from "../components/SkeletonBlock";

type Props = {
  teacherId: string;
  students: TeacherStudent[];
};

type AttendanceSummary = {
  record: ClassAttendanceRecord;
  present: number;
  absent: number;
  late: number;
};

const AttendanceHistoryScreen = ({ teacherId, students }: Props) => {
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const parseAttendanceCounts = (attendanceRaw: string) => {
    try {
      const parsed = JSON.parse(attendanceRaw);
      if (!Array.isArray(parsed)) {
        return { present: 0, absent: 0, late: 0 };
      }
      return parsed.reduce(
        (acc, entry) => {
          if (!entry || typeof entry.status !== "string") {
            return acc;
          }
          const status = entry.status.toLowerCase();
          if (status === "present") {
            acc.present += 1;
          } else if (status === "absent") {
            acc.absent += 1;
          } else if (status === "late") {
            acc.late += 1;
          }
          return acc;
        },
        { present: 0, absent: 0, late: 0 }
      );
    } catch (error) {
      return { present: 0, absent: 0, late: 0 };
    }
  };

  const formatRecordDate = useCallback((dateTime: string) => {
    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) {
      return dateTime;
    }
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!teacherId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getAllClassAttendance(teacherId);
      setRecords(response.data ?? []);
    } catch (error) {
      setErrorMessage("Unable to load attendance records.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const studentMap = useMemo(() => {
    const map = new Map<string, TeacherStudent>();
    students.forEach((student) => {
      map.set(student.id, student);
    });
    return map;
  }, [students]);

  const parseAttendanceEntries = useCallback((attendanceRaw: string) => {
    try {
      const parsed = JSON.parse(attendanceRaw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (entry) =>
          entry &&
          typeof entry.student_id === "string" &&
          typeof entry.status === "string"
      );
    } catch (error) {
      return [];
    }
  }, []);

  const summaries = useMemo<AttendanceSummary[]>(
    () =>
      records.map((record) => ({
        record,
        ...parseAttendanceCounts(record.attendance),
      })),
    [records, parseAttendanceCounts]
  );

  if (!teacherId) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-circle-outline" size={42} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Missing teacher profile</Text>
        <Text style={styles.emptySubtitle}>Sign in again to view attendance records.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.skeletonList}>
        <View style={styles.skeletonCard}>
          <SkeletonBlock style={styles.skeletonTitle} />
          <SkeletonBlock style={styles.skeletonSubtitle} />
          <View style={styles.skeletonStats}>
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
          </View>
        </View>
        <View style={styles.skeletonCard}>
          <SkeletonBlock style={styles.skeletonTitle} />
          <SkeletonBlock style={styles.skeletonSubtitle} />
          <View style={styles.skeletonStats}>
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
          </View>
        </View>
        <View style={styles.skeletonCard}>
          <SkeletonBlock style={styles.skeletonTitle} />
          <SkeletonBlock style={styles.skeletonSubtitle} />
          <View style={styles.skeletonStats}>
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
            <SkeletonBlock style={styles.skeletonChip} />
          </View>
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={40} color="#F97316" />
        <Text style={styles.emptyTitle}>Unable to load</Text>
        <Text style={styles.emptySubtitle}>{errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={loadAttendance}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (summaries.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="clipboard-outline" size={40} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No attendance records</Text>
        <Text style={styles.emptySubtitle}>
          Attendance submissions will appear here once recorded.
        </Text>
        <Pressable style={styles.retryButton} onPress={loadAttendance}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Attendance Records</Text>
        </View>
        {/* <Pressable style={styles.refreshButton} onPress={loadAttendance}>
          <Ionicons name="refresh" size={16} color="#0E63BB" />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable> */}
      </View>

      <View style={styles.list}>
        {summaries.map(({ record, present, absent, late }) => {
          const isExpanded = expandedRecordId === record.id;
          const entries = parseAttendanceEntries(record.attendance);
          const subject =
            record.subject?.trim() ||
            record.subject_name?.trim() ||
            "";
          const subtitleParts = [subject, formatRecordDate(record.date_logged)].filter(
            (value) => value
          );
          return (
            <View key={record.id} style={styles.card}>
              <Pressable
                onPress={() =>
                  setExpandedRecordId(isExpanded ? null : record.id)
                }
                style={styles.cardHeader}
              >
                <View>
                  <Text style={styles.cardTitle}>
                    {record.assigned_section || record.section_name || "Class"}
                  </Text>
                  <Text style={styles.cardSubtitle}>{subtitleParts.join(" • ")}</Text>
                </View>
                <View style={styles.headerRight}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {present + absent + late} students
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B7D8F"
                  />
                </View>
              </Pressable>
              <View style={styles.statsRow}>
                <View style={[styles.statChip, styles.presentChip]}>
                  <Text style={styles.statText}>{present} Present</Text>
                </View>
                <View style={[styles.statChip, styles.absentChip]}>
                  <Text style={styles.statText}>{absent} Absent</Text>
                </View>
                <View style={[styles.statChip, styles.lateChip]}>
                  <Text style={styles.statText}>{late} Late</Text>
                </View>
              </View>
              {isExpanded ? (
                <View style={styles.detailList}>
                  {entries.length === 0 ? (
                    <Text style={styles.detailEmpty}>No attendance details.</Text>
                  ) : (
                    entries.map((entry) => {
                      const student = studentMap.get(entry.student_id);
                      const name = student?.fullName || `Student ${entry.student_id}`;
                      const status = entry.status.toLowerCase();
                      const statusStyle =
                        status === "present"
                          ? styles.detailStatusPresent
                          : status === "absent"
                          ? styles.detailStatusAbsent
                          : styles.detailStatusLate;
                      return (
                        <View key={`${record.id}-${entry.student_id}`} style={styles.detailRow}>
                          <Text style={styles.detailName}>{name}</Text>
                          <View style={[styles.detailStatusChip, statusStyle]}>
                            <Text style={styles.detailStatusText}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7D8F",
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCE6F0",
    backgroundColor: "#F8FAFC",
  },
  refreshText: {
    fontSize: 12,
    color: "#0E63BB",
    fontWeight: "600",
  },
  list: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#6B7D8F",
    marginTop: 4,
  },
  badge: {
    backgroundColor: "#0E63BB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F5",
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailName: {
    fontSize: 13,
    color: "#1A2B3C",
    fontWeight: "600",
  },
  detailStatusChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  detailStatusPresent: {
    backgroundColor: "#DCFCE7",
  },
  detailStatusAbsent: {
    backgroundColor: "#FEE2E2",
  },
  detailStatusLate: {
    backgroundColor: "#FEF3C7",
  },
  detailEmpty: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  statChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presentChip: {
    backgroundColor: "#DCFCE7",
  },
  absentChip: {
    backgroundColor: "#FEE2E2",
  },
  lateChip: {
    backgroundColor: "#FEF3C7",
  },
  statText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7D8F",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#0E63BB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  skeletonList: {
    gap: 12,
  },
  skeletonCard: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  skeletonTitle: {
    height: 14,
    width: "60%",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 10,
    width: "40%",
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonStats: {
    flexDirection: "row",
    gap: 8,
  },
  skeletonChip: {
    height: 22,
    width: 72,
    borderRadius: 12,
  },
});

export default AttendanceHistoryScreen;
