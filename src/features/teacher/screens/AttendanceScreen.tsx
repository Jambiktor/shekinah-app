import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NfcManager, { Ndef, NfcEvents } from "react-native-nfc-manager";
import { TeacherStudent } from "../types";
import {
  AttendanceLogEntry,
  AttendanceStatus,
  getClassAttendance,
  submitAttendanceWithQueue,
} from "../api/teacher/attendance";
import { formatTimeRange12h } from "../helpers/time";

type Student = {
  id: string;
  name: string;
  rollNumber: string;
  cardNumber: string;
  cardImage?: string | null;
  status: AttendanceStatus | null;
};

type Props = {
  selectedClass: string | null;
  students: TeacherStudent[];
  teacherId: string;
  isLoading: boolean;
};

const normalizeCardNumber = (value: string) =>
  value.replace(/\s+/g, "").toLowerCase();

const extractCardNumberFromText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get("id");
    if (id) {
      return id;
    }
  } catch {
    // Not a URL, continue with raw string.
  }

  const match = trimmed.match(/[?&]id=([^&]+)/i);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  return trimmed;
};

const extractCardNumberFromTag = (tag: any) => {
  if (!tag) {
    return null;
  }

  const records = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
  for (const record of records) {
    if (!record?.payload) {
      continue;
    }

    let decoded: string | null = null;
    try {
      decoded = Ndef.text.decodePayload(record.payload);
    } catch {
      // Not a text record.
    }
    if (!decoded) {
      try {
        decoded = Ndef.uri.decodePayload(record.payload);
      } catch {
        // Not a URI record.
      }
    }

    if (decoded) {
      const cardNumber = extractCardNumberFromText(decoded);
      if (cardNumber) {
        return cardNumber;
      }
    }
  }

  const rawId = tag.id ?? tag.identifier;
  if (typeof rawId === "string") {
    return rawId;
  }
  if (Array.isArray(rawId)) {
    return rawId.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("");
  }

  return null;
};

const buildDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseRecordDate = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      trimmed
    );
  if (dateTimeMatch) {
    const [, year, month, day, hours, minutes, seconds] = dateTimeMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hours ? Number(hours) : 0,
      minutes ? Number(minutes) : 0,
      seconds ? Number(seconds) : 0
    );
  }
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const parseRecordDateKey = (value: string) => {
  const parsed = parseRecordDate(value);
  return parsed ? buildDateKey(parsed) : null;
};

const normalizeSubject = (value?: string | null) =>
  (value || "").trim().toLowerCase();

const parseSubjectStartMinutes = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const startText = value.split("-")[0]?.trim() ?? "";
  if (!startText) {
    return null;
  }

  const match = startText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) {
    return null;
  }

  const hoursRaw = Number(match[1]);
  const minutesRaw = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();

  if (Number.isNaN(hoursRaw) || Number.isNaN(minutesRaw)) {
    return null;
  }

  let hours = hoursRaw;
  if (meridiem) {
    if (hours === 12) {
      hours = meridiem === "am" ? 0 : 12;
    } else if (meridiem === "pm") {
      hours += 12;
    }
  }

  if (hours < 0 || hours > 23 || minutesRaw < 0 || minutesRaw > 59) {
    return null;
  }

  return hours * 60 + minutesRaw;
};

const splitSubjects = (value?: string) =>
  (value || "")
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

const joinSubjects = (values: string[]) =>
  values.length > 0 ? Array.from(new Set(values)).join(", ") : "";

const CLASS_ID_SEPARATOR = "::";
const SECTION_SPLIT_REGEX = /\s[-\u2013]\s/;
const splitSectionLabel = (value: string) => value.split(SECTION_SPLIT_REGEX);
const getGradeLabel = (value: string) => splitSectionLabel(value)[0]?.trim() || value;

const parseClassId = (value?: string | null) => {
  if (!value) {
    return { assignmentId: undefined, assignedSection: "", subject: "" };
  }

  const parts = value.split(CLASS_ID_SEPARATOR);
  if (parts.length === 1) {
    return { assignmentId: undefined, assignedSection: value, subject: "" };
  }
  if (parts.length === 2) {
    return { assignmentId: undefined, assignedSection: parts[0], subject: parts[1] };
  }

  return {
    assignmentId: parts[0] || undefined,
    assignedSection: parts[1],
    subject: parts.slice(2).join(CLASS_ID_SEPARATOR),
  };
};

const AttendanceScreen = ({ selectedClass, students: roster, teacherId, isLoading }: Props) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [isFetchingExisting, setIsFetchingExisting] = useState(false);
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);
  const [existingAttendanceId, setExistingAttendanceId] = useState<string | null>(null);
  const [lastSaveAction, setLastSaveAction] = useState<"submit" | "update" | null>(null);
  const [lastSaveQueued, setLastSaveQueued] = useState(false);
  const [tapNotice, setTapNotice] = useState<{ name: string; cardNumber: string } | null>(
    null
  );
  const [isTapVisible, setIsTapVisible] = useState(false);
  const [isNfcReady, setIsNfcReady] = useState(false);

  const animateNext = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, []);

  useEffect(() => {
    const isFabric = Boolean((global as any)?.nativeFabricUIManager);
    if (
      Platform.OS === "android" &&
      !isFabric &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const classRoster = useMemo(() => {
    if (!selectedClass) {
      return [];
    }

    const { assignmentId, assignedSection, subject } = parseClassId(selectedClass);
    return roster.filter((student) => {
      if (assignmentId && student.assignmentId !== assignmentId) {
        return false;
      }
      if (student.assignedSection !== assignedSection) {
        return false;
      }
      if (!subject) {
        return true;
      }
      return splitSubjects(student.subject).includes(subject);
    });
  }, [roster, selectedClass]);

  const cardLookup = useMemo(() => {
    const map = new Map<string, string>();
    classRoster.forEach((student) => {
      const normalized = normalizeCardNumber(student.cardNumber || "");
      if (normalized) {
        map.set(normalized, student.id);
      }
    });
    return map;
  }, [classRoster]);

  const buildStudentList = useCallback(
    (attendanceMap?: Map<string, AttendanceStatus>) =>
      classRoster.map((student) => ({
        id: student.id,
        name: student.fullName || "Unknown Student",
        rollNumber: student.id,
        cardNumber: student.cardNumber || "",
        cardImage: student.cardImage ?? null,
        status: attendanceMap?.get(student.id) ?? null,
      })),
    [classRoster]
  );

  useEffect(() => {
    if (!selectedClass) {
      animateNext();
      setStudents([]);
      return;
    }

    animateNext();
    setStudents(buildStudentList());
  }, [animateNext, buildStudentList, classRoster, selectedClass]);

  const parseAttendanceEntries = useCallback((raw: string): AttendanceLogEntry[] => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (entry) =>
          entry &&
          typeof entry.student_id === "string" &&
          (entry.status === "present" || entry.status === "absent" || entry.status === "late")
      );
    } catch (error) {
      console.warn("Failed to parse attendance payload", error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (!selectedClass || !teacherId) {
      return;
    }

    const { assignmentId, assignedSection, subject: selectedSubject } =
      parseClassId(selectedClass);
    const normalizedSelectedSubject = normalizeSubject(selectedSubject);
    let isActive = true;
    // console.log("Attendance fetch start:", {
    //   assignedSection,
    //   selectedSubject: selectedSubject || null,
    // });
    setStudents(buildStudentList());
    setHasExistingAttendance(false);
    setExistingAttendanceId(null);
    setLastSaved(null);
    setLastSaveAction(null);
    setLastSaveQueued(false);
    setIsFetchingExisting(true);
    getClassAttendance(teacherId, assignedSection, assignmentId)
      .then((response) => {
        // console.log("getClassAttendance response:", response);
        // console.log("getClassAttendance response:", response);
        if (!isActive) {
          return;
        }

        const records = response.data ?? [];
        const recordsForClass = assignmentId
          ? records.filter((entry) => String(entry.assignment_id || "") === assignmentId)
          : (() => {
              const sectionRecords = records.filter((entry) => {
                const section =
                  entry.assigned_section || entry.section_name || "";
                return section === assignedSection;
              });
              if (!normalizedSelectedSubject) {
                return sectionRecords;
              }
              return sectionRecords.filter((entry) => {
                const subject =
                  entry.subject || entry.subject_name || "";
                return normalizeSubject(subject) === normalizedSelectedSubject;
              });
            })();
        const todayKey = buildDateKey(new Date());
        const subjectTime = classRoster.find((student) => student.subjectTime)?.subjectTime;
        const subjectStartMinutes = parseSubjectStartMinutes(subjectTime);
        const subjectStartTimestamp =
          subjectStartMinutes === null
            ? null
            : (() => {
                const date = new Date();
                date.setHours(
                  Math.floor(subjectStartMinutes / 60),
                  subjectStartMinutes % 60,
                  0,
                  0
                );
                return date.getTime();
              })();
        const recordsWithMeta = recordsForClass
          .map((record) => ({
            record,
            dateKey: parseRecordDateKey(record.date_logged),
            timestamp: parseRecordDate(record.date_logged)?.getTime() ?? 0,
          }))
          .sort((a, b) => {
            if (subjectStartTimestamp !== null) {
              const diffA = Math.abs(a.timestamp - subjectStartTimestamp);
              const diffB = Math.abs(b.timestamp - subjectStartTimestamp);
              if (diffA !== diffB) {
                return diffA - diffB;
              }
            }
            return b.timestamp - a.timestamp;
          });
        const recordForToday =
          recordsWithMeta.find((entry) => entry.dateKey === todayKey)?.record;

        // console.log("Attendance record chosen:", {
        //   selectedSubject: selectedSubject || null,
        //   recordSubject: recordForToday?.subject ?? null,
        //   recordId: recordForToday?.id ?? null,
        //   recordDate: recordForToday?.date_logged ?? null,
        // });

        if (!recordForToday) {
          setStudents(buildStudentList());
          setLastSaved(null);
          setHasExistingAttendance(false);
          setExistingAttendanceId(null);
          return;
        }

        const entries = parseAttendanceEntries(recordForToday.attendance);
        const attendanceMap = new Map(
          entries.map((entry) => [entry.student_id, entry.status])
        );
        setStudents(buildStudentList(attendanceMap));
        setLastSaved(parseRecordDate(recordForToday.date_logged));
        setHasExistingAttendance(true);
        setExistingAttendanceId(recordForToday.id);
      })
      .catch((error) => {
        console.error("Failed to load existing attendance", error);
      })
      .finally(() => {
        if (isActive) {
          setIsFetchingExisting(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [buildStudentList, classRoster, parseAttendanceEntries, selectedClass, teacherId]);

  useEffect(() => {
    if (!isSuccessVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setIsSuccessVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isSuccessVisible]);

  useEffect(() => {
    if (!isTapVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setIsTapVisible(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, [isTapVisible]);

  const handleNfcTap = useCallback(
    (tag: any) => {
      if (!selectedClass || cardLookup.size === 0) {
        return;
      }

      const cardNumber = extractCardNumberFromTag(tag);
      if (!cardNumber) {
        console.warn("NFC tag detected, but no card number was found.");
        return;
      }

      const studentId = cardLookup.get(normalizeCardNumber(cardNumber));
      if (!studentId) {
        console.warn("No matching student for card number:", cardNumber);
        return;
      }

      animateNext();
      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== studentId) {
            return student;
          }

          setTapNotice({
            name: student.name,
            cardNumber,
          });
          setIsTapVisible(true);
          return { ...student, status: "present" };
        })
      );
    },
    [animateNext, cardLookup, selectedClass]
  );

  useEffect(() => {
    let isActive = true;

    if (!selectedClass) {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.unregisterTagEvent().catch(() => undefined);
      setIsNfcReady(false);
      return;
    }

    const startNfc = async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!supported || !isActive) {
          setIsNfcReady(false);
          return;
        }

        const enabled = await NfcManager.isEnabled();
        if (!enabled || !isActive) {
          setIsNfcReady(false);
          Alert.alert(
            "Enable NFC",
            "Turn on NFC to scan attendance cards.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () => {
                  if (Platform.OS === "android") {
                    (NfcManager as any).goToNfcSetting?.();
                  } else {
                    Linking.openSettings().catch(() => undefined);
                  }
                },
              },
            ],
            { cancelable: true }
          );
          return;
        }

        await NfcManager.start();
        NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag) => {
          if (isActive) {
            handleNfcTap(tag);
          }
        });
        await NfcManager.registerTagEvent();
        if (isActive) {
          setIsNfcReady(true);
        }
      } catch (error) {
        console.warn("Failed to start NFC scanning", error);
        if (isActive) {
          setIsNfcReady(false);
        }
      }
    };

    startNfc();

    return () => {
      isActive = false;
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.unregisterTagEvent().catch(() => undefined);
      setIsNfcReady(false);
    };
  }, [handleNfcTap, selectedClass]);

  const classMeta = useMemo(() => {
    if (!selectedClass) {
      return { title: "", subtitle: "", count: 0 };
    }

    const { assignedSection, subject: selectedSubject } = parseClassId(selectedClass);
    const subjectList = classRoster.flatMap((student) => splitSubjects(student.subject));
    const subject = selectedSubject || joinSubjects(subjectList);
    const subjectTime = classRoster.find((student) => student.subjectTime)?.subjectTime;
    const subjectTimeLabel = formatTimeRange12h(subjectTime);
    const grade = getGradeLabel(assignedSection);
    const subtitleParts = [grade];
    if (subject && subject !== grade) {
      subtitleParts.push(subject);
    }
    subtitleParts.push(subjectTimeLabel || "Schedule TBD");

    return {
      title: subject || assignedSection,
      subtitle: subtitleParts.join(" - "),
      count: classRoster.length,
    };
  }, [classRoster, selectedClass]);

  const markAttendance = (studentId: string, status: AttendanceStatus) => {
    const student = students.find((item) => item.id === studentId);
    // console.log("Attendance mark:", {
    //   studentId,
    //   name: student?.name,
    //   status,
    //   hasExistingAttendance,
    // });
    animateNext();
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) {
          return s;
        }
        const nextStatus = s.status === status ? null : status;
        return { ...s, status: nextStatus };
      })
    );
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const markAllPresent = () => {
    // console.log("Attendance mark all present:", {
    //   count: students.length,
    //   hasExistingAttendance,
    // });
    animateNext();
    setStudents((prev) => prev.map((s) => ({ ...s, status: "present" })));
  };

  const handleSubmit = async () => {
    if (!selectedClass) {
      return;
    }
    if (!teacherId) {
      console.error("Missing teacher id for attendance submission.");
      return;
    }

    const { assignmentId, assignedSection, subject: selectedSubject } =
      parseClassId(selectedClass);
    if (!assignmentId) {
      Alert.alert(
        "Missing assignment",
        "Select a class tied to an assignment before submitting attendance."
      );
      return;
    }

    const attendance = students
      .filter((student) => student.status)
      .map((student) => ({
        studentId: student.id,
        status: student.status as AttendanceStatus,
      }));

    if (attendance.length === 0) {
      console.error("No attendance entries to submit.");
      return;
    }

    const subjectForSubmission = [
      selectedSubject,
      classRoster.find((student) => student.subject)?.subject,
      classMeta.title,
    ]
      .map((value) => value?.trim())
      .find((value) => value);
    const submissionDate = hasExistingAttendance
      ? lastSaved
        ? formatDate(lastSaved)
        : undefined
      : formatDate(new Date());

    const payload = {
      assignmentId,
      teacherId,
      date: submissionDate,
      attendanceId: existingAttendanceId ?? undefined,
      attendance,
    };
    const cacheMeta = {
      assignedSection: assignedSection,
      subject: subjectForSubmission,
    };
    if (__DEV__) {
      // console.log("Attendance submission payload:", payload);
    }
    setIsSaving(true);
    setLastSaveQueued(false);
    try {
      const isUpdating = hasExistingAttendance;
      const response = await submitAttendanceWithQueue(
        payload,
        cacheMeta,
        { forceUpdate: isUpdating }
      );
      // console.log("Attendance submission response:", response);
      setIsSaving(false);
      setLastSaved(new Date());
      setHasExistingAttendance(true);
      setLastSaveAction(isUpdating ? "update" : "submit");
      setLastSaveQueued(Boolean(response.queued));
      setIsSuccessVisible(true);
    } catch (error) {
      console.error("Failed to submit attendance", error);
      setIsSaving(false);
    }
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const unmarked = students.filter((s) => !s.status).length;

  if (!selectedClass) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="book-outline" size={40} color="#E8ECEF" />
        <Text style={styles.emptyTitle}>No Class Selected</Text>
        <Text style={styles.emptySubtitle}>
          Select a class from the Classes tab to start marking attendance.
        </Text>
      </View>
    );
  }

  if (isLoading || isFetchingExisting) {
    return (
      <View>
        <View style={styles.skeletonCard}>
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonDivider} />
        </View>
        <View style={styles.skeletonStatsRow}>
          <View style={styles.skeletonStatBox} />
          <View style={styles.skeletonStatBox} />
          <View style={styles.skeletonStatBox} />
          <View style={styles.skeletonStatBox} />
        </View>
        <View style={styles.skeletonButton} />
        <View style={styles.skeletonList}>
          <View style={styles.skeletonStudentCard} />
          <View style={styles.skeletonStudentCard} />
          <View style={styles.skeletonStudentCard} />
        </View>
        <View style={styles.skeletonSubmitRow}>
          <View style={styles.skeletonLineShort} />
          <View style={styles.skeletonSubmitButton} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.classOverview}>
        <View style={styles.classHeader}>
          <View style={styles.classHeaderText}>
            <Text style={styles.classTitle}>{classMeta.title}</Text>
            <Text style={styles.classSubtitle}>{classMeta.subtitle}</Text>
          </View>
          <View style={styles.classCountBadge}>
            <Text style={styles.classCountText}>{classMeta.count} students</Text>
          </View>
        </View>
      </View>

      {isNfcReady ? (
        <View style={styles.nfcNotice}>
          <Ionicons name="wifi" size={16} color="#0E63BB" />
          <Text style={styles.nfcNoticeText}>NFC ready — tap a card</Text>
        </View>
      ) : null}

      <View style={styles.attendanceStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Present</Text>
          <Text style={[styles.statValue, styles.statValuePresent]}>{presentCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Absent</Text>
          <Text style={[styles.statValue, styles.statValueAbsent]}>{absentCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Late</Text>
          <Text style={[styles.statValue, styles.statValueLate]}>{lateCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Unmarked</Text>
          <Text style={styles.statValue}>{unmarked}</Text>
        </View>
      </View>

      <Pressable onPress={markAllPresent} style={styles.presentAllButton}>
        <Text style={styles.presentAllText}>Mark All Present</Text>
      </Pressable>

      <View style={styles.studentList}>
        {students.map((student) => {
          const statusStyle =
            student.status === "present"
              ? styles.studentCardPresent
              : student.status === "absent"
              ? styles.studentCardAbsent
              : student.status === "late"
              ? styles.studentCardLate
              : styles.studentCardDefault;

          return (
            <View key={student.id} style={[styles.studentCard, statusStyle]}>
              <View style={styles.studentHeader}>
                <View style={styles.studentHeaderMeta}>
                  <View style={styles.studentAvatar}>
                    {student.cardImage ? (
                      <Image
                        source={{ uri: student.cardImage }}
                        style={styles.studentAvatarImage}
                      />
                    ) : (
                      <Ionicons name="person-outline" size={18} color="#6B7D8F" />
                    )}
                  </View>
                  <View>
                    <View style={styles.studentNameRow}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      {/* <Text style={styles.studentCardNumber}>
                        {student.cardNumber ? `Card ${student.cardNumber}` : "Card N/A"}
                      </Text> */}
                    </View>
                    {/* <Text style={styles.studentRoll}>Roll #{student.rollNumber}</Text> */}
                  </View>
                </View>
                {student.status ? (
                  <View
                    style={[
                      styles.statusDot,
                      student.status === "present"
                        ? styles.statusDotPresent
                        : student.status === "absent"
                        ? styles.statusDotAbsent
                        : styles.statusDotLate,
                    ]}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <View style={styles.attendanceActions}>
                <Pressable
                  onPress={() => markAttendance(student.id, "present")}
                  style={[styles.attendanceButton, styles.attendancePresent]}
                >
                  <Text style={styles.attendanceButtonText}>Present</Text>
                </Pressable>
                <Pressable
                  onPress={() => markAttendance(student.id, "absent")}
                  style={[styles.attendanceButton, styles.attendanceAbsent]}
                >
                  <Text style={styles.attendanceButtonText}>Absent</Text>
                </Pressable>
                <Pressable
                  onPress={() => markAttendance(student.id, "late")}
                  style={[styles.attendanceButton, styles.attendanceLate]}
                >
                  <Text style={styles.attendanceButtonText}>Late</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.submitRow}>
        <View>
          {lastSaved ? (
            <Text style={styles.lastSavedText}>Last saved: {lastSaved.toLocaleTimeString()}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={handleSubmit}
          disabled={isSaving || unmarked > 0}
          style={[
            styles.submitButton,
            (isSaving || unmarked > 0) && styles.submitButtonDisabled,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving
              ? "Saving..."
              : hasExistingAttendance
              ? "Update Attendance"
              : "Submit Attendance"}
          </Text>
        </Pressable>
      </View>
      <Modal transparent visible={isSuccessVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsSuccessVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => setIsSuccessVisible(false)}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>
              {lastSaveAction === "update" ? "Attendance updated" : "Attendance submitted"}
            </Text>
            <Text style={styles.modalMessage}>
              {lastSaveQueued
                ? "Saved offline. Will sync when online."
                : lastSaveAction === "update"
                ? "Your attendance has been updated successfully."
                : "Your attendance has been saved successfully."}
            </Text>
            <Text style={styles.modalDetails}>
              {classMeta.title} • {formatDate(new Date())}
            </Text>
            <View style={styles.modalStatsRow}>
              <View style={[styles.modalStatChip, styles.modalStatChipPresent]}>
                <Text style={styles.modalStatText}>{presentCount} Present</Text>
              </View>
              <View style={[styles.modalStatChip, styles.modalStatChipAbsent]}>
                <Text style={styles.modalStatText}>{absentCount} Absent</Text>
              </View>
              <View style={[styles.modalStatChip, styles.modalStatChipLate]}>
                <Text style={styles.modalStatText}>{lateCount} Late</Text>
              </View>
            </View>
            <Pressable
              style={styles.modalButton}
              onPress={() => setIsSuccessVisible(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      <Modal transparent visible={isTapVisible} animationType="fade">
        <Pressable style={styles.tapBackdrop} onPress={() => setIsTapVisible(false)}>
          <Pressable style={styles.tapCard} onPress={() => setIsTapVisible(false)}>
            <View style={styles.tapIconWrap}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.tapTitle}>Marked Present</Text>
            <Text style={styles.tapName}>{tapNotice?.name || "Student"}</Text>
            <Text style={styles.tapDetails}>
              Card: {tapNotice?.cardNumber || "N/A"}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 13,
    color: "#6B7D8F",
    textAlign: "center",
  },
  classOverview: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EDF3",
    marginBottom: 16,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  classHeaderText: {
    flex: 1,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 6,
  },
  classSubtitle: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  classCountBadge: {
    backgroundColor: "#2C77BC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  classCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  classDivider: {
    height: 1,
    backgroundColor: "#EEF2F5",
    marginTop: 12,
  },
  presentAllButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  presentAllText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  attendanceStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
    marginBottom: 14,
  },
  statItem: {
    width: "24%",
    borderWidth: 1,
    borderColor: "#E7EDF3",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7D8F",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  statValuePresent: {
    color: "#22C55E",
  },
  statValueAbsent: {
    color: "#DC2626",
  },
  statValueLate: {
    color: "#F59E0B",
  },
  studentList: {
    gap: 12,
  },
  studentCard: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  studentCardDefault: {
    borderColor: "#E7EDF3",
    backgroundColor: "#FFFFFF",
  },
  studentCardPresent: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },
  studentCardAbsent: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  studentCardLate: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  studentHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  studentAvatarImage: {
    width: "100%",
    height: "100%",
  },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  studentCardNumber: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7D8F",
  },
  studentRoll: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  statusDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotPresent: {
    backgroundColor: "#22C55E",
  },
  statusDotAbsent: {
    backgroundColor: "#DC2626",
  },
  statusDotLate: {
    backgroundColor: "#F59E0B",
  },
  attendanceActions: {
    flexDirection: "row",
    gap: 8,
  },
  attendanceButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  attendancePresent: {
    backgroundColor: "#22C55E",
  },
  attendanceAbsent: {
    backgroundColor: "#DC2626",
  },
  attendanceLate: {
    backgroundColor: "#F59E0B",
  },
  attendanceButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  submitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E8ECEF",
    paddingTop: 16,
    marginTop: 16,
    gap: 8,
  },
  lastSavedText: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  submitButton: {
    backgroundColor: "#0E63BB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DC",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E7EDF3",
    marginBottom: 16,
  },
  skeletonLineWide: {
    height: 14,
    backgroundColor: "#E8ECEF",
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonLineShort: {
    height: 10,
    width: "60%",
    backgroundColor: "#E8ECEF",
    borderRadius: 8,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: "#EEF2F5",
    marginTop: 12,
  },
  skeletonStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 14,
  },
  skeletonStatBox: {
    width: "48%",
    height: 54,
    backgroundColor: "#E8ECEF",
    borderRadius: 12,
  },
  skeletonButton: {
    height: 42,
    backgroundColor: "#E8ECEF",
    borderRadius: 12,
    marginBottom: 16,
  },
  skeletonList: {
    gap: 12,
  },
  skeletonStudentCard: {
    height: 86,
    backgroundColor: "#E8ECEF",
    borderRadius: 14,
  },
  skeletonSubmitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E8ECEF",
    paddingTop: 16,
    marginTop: 16,
  },
  skeletonSubmitButton: {
    width: 140,
    height: 36,
    backgroundColor: "#E8ECEF",
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 22, 34, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 12,
    color: "#6B7D8F",
    textAlign: "center",
    marginBottom: 16,
  },
  modalDetails: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 8,
  },
  modalStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  modalStatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalStatChipPresent: {
    backgroundColor: "#DCFCE7",
  },
  modalStatChipAbsent: {
    backgroundColor: "#FEE2E2",
  },
  modalStatChipLate: {
    backgroundColor: "#FEF3C7",
  },
  modalStatText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  modalButton: {
    backgroundColor: "#0E63BB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tapBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 22, 34, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  tapCard: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  tapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tapTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  tapName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  tapDetails: {
    fontSize: 11,
    color: "#6B7D8F",
  },
  nfcNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 12,
  },
  nfcNoticeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0E63BB",
  },
});

export default AttendanceScreen;

