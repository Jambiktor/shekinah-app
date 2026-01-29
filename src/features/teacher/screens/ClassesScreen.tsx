import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeacherStudent } from "../types";
import { formatTimeRange12h, parseTimeRangeToMinutes } from "../helpers/time";

type ClassSession = {
  id: string;
  name: string;
  grade: string;
  gradeSection: string;
  subject: string;
  time: string;
  studentCount: number;
  assignedSection: string;
  assignmentId?: string;
};

type Props = {
  onClassSelect: (classId: string) => void;
  gradeFilter: string;
  gradeOptions: { label: string; value: string }[];
  onGradeChange: (grade: string) => void;
  students: TeacherStudent[];
};

const CLASS_ID_SEPARATOR = "::";
const splitSubjects = (value?: string) =>
  (value || "")
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

const buildClassId = (assignedSection: string, subject: string, assignmentId?: string) =>
  assignmentId
    ? `${assignmentId}${CLASS_ID_SEPARATOR}${assignedSection}${CLASS_ID_SEPARATOR}${subject}`
    : `${assignedSection}${CLASS_ID_SEPARATOR}${subject}`;

const ClassesScreen = ({
  onClassSelect,
  gradeFilter,
  gradeOptions,
  onGradeChange,
  students,
}: Props) => {
  const normalizedGradeFilter = gradeFilter === "all" ? "all" : gradeFilter;
  const menuOptions =
    gradeOptions.length > 0
      ? gradeOptions
      : [
          { label: "All Grades", value: "all" },
        ];
  const classSessions = useMemo(() => {
    const grouped = new Map<string, ClassSession>();

    students.forEach((student) => {
      const assignedSection = student.assignedSection.trim();
      if (!assignedSection) {
        return;
      }

      const assignmentId = student.assignmentId?.trim();
      const subjectList = splitSubjects(student.subject);
      const subjects = subjectList.length > 0 ? subjectList : ["Subject"];
      subjects.forEach((subject) => {
        const classId = buildClassId(assignedSection, subject, assignmentId);
        const existing = grouped.get(classId);
        if (existing) {
          existing.studentCount += 1;
          if (!existing.time || existing.time === "Schedule TBD") {
            const time = formatTimeRange12h(student.subjectTime);
            if (time) {
              existing.time = time;
            }
          }
          return;
        }

        const [gradeLabel, ...sectionParts] = assignedSection.split(" - ");
        const grade = gradeLabel?.trim() || assignedSection;
        const gradeSection = sectionParts.join(" - ").trim();
        const time = formatTimeRange12h(student.subjectTime);
        grouped.set(classId, {
          id: classId,
          name: assignedSection,
          grade,
          gradeSection,
          subject,
          time: time || "Schedule TBD",
          studentCount: 1,
          assignedSection,
          assignmentId,
        });
      });
    });

    return Array.from(grouped.values());
  }, [students]);

  const filteredClasses = useMemo(() => {
    if (normalizedGradeFilter === "all") {
      return classSessions;
    }

    return classSessions.filter((item) => item.assignedSection === normalizedGradeFilter);
  }, [classSessions, gradeFilter, normalizedGradeFilter]);

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  return (
    <View>
      <Text style={styles.sectionTitle}>Your Classes</Text>
      <Text style={styles.sectionSubtitle}>Tap a class to view class and attendance.</Text>
      <View style={styles.gradeSection}>
        <Text style={styles.gradeLabel}>Filter by grade</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradePills}
        >
          {menuOptions.map((option) => {
            const isActive = gradeFilter === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.gradePill, isActive && styles.gradePillActive]}
                onPress={() => onGradeChange(option.value)}
              >
                <Text style={[styles.gradePillText, isActive && styles.gradePillTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.cardList}>
        {filteredClasses.map((classItem) => {
          const sectionLabel = classItem.gradeSection
            ? `${classItem.grade} - ${classItem.gradeSection}`
            : classItem.grade;
          const timeLabel = classItem.time || "Schedule TBD";
          const timeRange = parseTimeRangeToMinutes(classItem.time);
          const isOngoing =
            timeRange !== null &&
            nowMinutes >= timeRange.start &&
            nowMinutes <= timeRange.end;
          const isDone = timeRange !== null && nowMinutes > timeRange.end;
          return (
            <Pressable
              key={classItem.id}
              onPress={() => onClassSelect(classItem.id)}
              style={({ pressed }) => [
                styles.classCard,
                isOngoing && styles.classCardOngoing,
                isDone && styles.classCardDone,
                pressed && styles.classCardPressed,
              ]}
            >
              <View style={styles.classCardHeader}>
                <View style={styles.classCardMeta}>
                  <Text style={styles.classCardTitle}>{classItem.subject}</Text>
                  <View style={styles.classCardSubRow}>
                    <Ionicons name="school-outline" size={14} color="#6B7D8F" />
                    <Text style={styles.classCardSubtitle}>{sectionLabel}</Text>
                  </View>
                </View>
                <View style={styles.classCardMetaRight}>
                  <View style={styles.classCountBadge}>
                    <Text style={styles.classCountText}>
                      {classItem.studentCount} students
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#94A3B8"
                    style={styles.classCardChevron}
                  />
                </View>
              </View>
              <View style={styles.classTimeRow}>
                <Ionicons name="time-outline" size={14} color="#6B7D8F" />
                <Text style={styles.classTimeText}>{timeLabel}</Text>
              </View>
            </Pressable>
          );
        })}
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={36} color="#E8ECEF" />
            <Text style={styles.emptyTitle}>No classes yet</Text>
            <Text style={styles.emptySubtitle}>
              Try a different grade filter or check back later.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gradeSection: {
    marginBottom: 20,
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7D8F",
    marginBottom: 10,
  },
  gradePills: {
    flexDirection: "row",
    gap: 10,
  },
  gradePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1E7ED",
    backgroundColor: "#FFFFFF",
  },
  gradePillActive: {
    backgroundColor: "#2C77BC",
    borderColor: "#2C77BC",
  },
  gradePillText: {
    fontSize: 12,
    color: "#6B7D8F",
    fontWeight: "600",
  },
  gradePillTextActive: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7D8F",
    marginBottom: 18,
  },
  cardList: {
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6B7D8F",
    textAlign: "center",
  },
  classCard: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  classCardOngoing: {
    borderColor: "#c1e9c8ff",
    borderWidth: 1,
    backgroundColor: "#F3FBF6",
  },
  classCardDone: {
    borderColor: "#94A3B8",
    borderWidth: 2,
    backgroundColor: "#F8FAFC",
  },
  classCardPressed: {
    backgroundColor: "#F8FAFC",
  },
  classCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  classCardMeta: {
    flex: 1,
    marginRight: 8,
  },
  classCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  classCardSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  classCardSubtitle: {
    fontSize: 12,
    color: "#6B7D8F",
    fontWeight: "500",
  },
  classCardMetaRight: {
    alignItems: "flex-end",
    gap: 10,
  },
  classCountBadge: {
    backgroundColor: "#2C77BC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  classCardChevron: {
    marginTop: 2,
  },
  classTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F5",
  },
  classTimeText: {
    fontSize: 12,
    color: "#6B7D8F",
  },
});

export default ClassesScreen;
