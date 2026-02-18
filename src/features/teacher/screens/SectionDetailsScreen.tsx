
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { TeacherStudent } from "../types";
import { formatTimeRange12h } from "../helpers/time";
import {
  AttendanceStatus,
  ClassAttendanceRecord,
  getAllClassAttendance,
} from "../api/teacher/attendance";
import {
  ApiStudentNote,
  deleteStudentNote,
  getStudentNotes,
  saveStudentNote,
} from "../api/teacher/notes";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Props = {
  selectedClass: string | null;
  teacherId: string;
  students: TeacherStudent[];
  onBack: () => void;
  onStartAttendance: () => void;
};

type StudentNote = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
};

const CLASS_ID_SEPARATOR = "::";
const splitSubjects = (value?: string) =>
  (value || "")
    .split(",")
    .map((subject) => subject.trim())
    .filter(Boolean);

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

const SectionDetailsScreen = ({
  selectedClass,
  teacherId,
  students,
  onBack,
  onStartAttendance,
}: Props) => {
  const { theme } = useTheme();
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudent | null>(null);
  const [activeTab, setActiveTab] = useState<"attendance" | "details" | "notes">(
    "details"
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    Array<{ record: ClassAttendanceRecord; status: AttendanceStatus }>
  >([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteIndex, setRouletteIndex] = useState(0);
  const [rouletteWinner, setRouletteWinner] = useState<string | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const rouletteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const classRoster = useMemo(() => {
    if (!selectedClass) {
      return [];
    }
    const { assignmentId, assignedSection, subject } = parseClassId(selectedClass);
    return students.filter((student) => {
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
  }, [students, selectedClass]);

  const classMeta = useMemo(() => {
    if (!selectedClass) {
      return { section: "", subject: "", time: "" };
    }

    const { assignedSection, subject: selectedSubject } = parseClassId(selectedClass);
    const subjectList = classRoster.flatMap((student) => splitSubjects(student.subject));
    const subject = selectedSubject || subjectList[0] || "";
    const time = formatTimeRange12h(
      classRoster.find((student) => student.subjectTime)?.subjectTime
    );

    return {
      section: assignedSection,
      subject,
      time,
    };
  }, [classRoster, selectedClass]);

  const rouletteStudents = useMemo(
    () =>
      classRoster
        .map((student) => ({
          name: student.fullName?.trim() || "",
          cardImage: student.cardImage ?? null,
        }))
        .filter((student) => student.name.length > 0),
    [classRoster]
  );

  const rouletteNames = useMemo(
    () => rouletteStudents.map((student) => student.name),
    [rouletteStudents]
  );

  useEffect(() => {
    if (rouletteNames.length > 0 && rouletteIndex < rouletteNames.length) {
      return;
    }
    setRouletteIndex(0);
    setRouletteWinner(null);
  }, [rouletteNames, rouletteIndex]);

  useEffect(() => {
    return () => {
      if (rouletteTimer.current) {
        clearTimeout(rouletteTimer.current);
        rouletteTimer.current = null;
      }
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
        copyTimer.current = null;
      }
    };
  }, []);

  const stopRoulette = () => {
    if (rouletteTimer.current) {
      clearTimeout(rouletteTimer.current);
      rouletteTimer.current = null;
    }
    setRouletteSpinning(false);
  };

  const closeRoulette = () => {
    stopRoulette();
    setShowRoulette(false);
    setRouletteWinner(null);
  };

  const spinRoulette = () => {
    if (rouletteSpinning || rouletteNames.length === 0) {
      return;
    }
    stopRoulette();
    setRouletteSpinning(true);
    setRouletteWinner(null);

    const totalSteps = 24 + Math.floor(Math.random() * 16);
    let step = 0;
    let delay = 60;
    let currentIndex = rouletteIndex;

    const spin = () => {
      if (rouletteNames.length === 0) {
        setRouletteSpinning(false);
        return;
      }
      currentIndex = (currentIndex + 1) % rouletteNames.length;
      setRouletteIndex(currentIndex);
      step += 1;
      if (step < totalSteps) {
        delay += 8;
        rouletteTimer.current = setTimeout(spin, delay);
      } else {
        setRouletteSpinning(false);
        setRouletteWinner(rouletteNames[currentIndex]);
      }
    };

    spin();
  };

  const getInitials = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "?";
    }
    const parts = trimmed.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${last}`.toUpperCase();
  };

  const handleCopyEmergencyContact = async () => {
    const value = selectedStudent?.parentMobile?.trim();
    if (!value) {
      return;
    }
    await Clipboard.setStringAsync(value);
    setCopyFeedback("Copied");
    if (copyTimer.current) {
      clearTimeout(copyTimer.current);
    }
    copyTimer.current = setTimeout(() => {
      setCopyFeedback(null);
      copyTimer.current = null;
    }, 1500);
  };


  useEffect(() => {
    let isActive = true;

    const loadAttendanceRecords = async () => {
      if (!selectedStudent || !teacherId) {
        return;
      }

      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const response = await getAllClassAttendance(teacherId);
        if (!isActive) {
          return;
        }
        const records = response.data ?? [];
        const { assignmentId, assignedSection } = parseClassId(selectedClass);
        const filtered = records.filter((record) => {
          if (assignmentId && String(record.assignment_id ?? "") !== assignmentId) {
            return false;
          }
          if (assignedSection) {
            const recordSection = record.assigned_section || record.section_name || "";
            return recordSection === assignedSection;
          }
          return true;
        });

        const entries = filtered
          .map((record) => {
            try {
              const parsed = JSON.parse(record.attendance);
              if (!Array.isArray(parsed)) {
                return null;
              }
              const match = parsed.find(
                (entry) => entry && String(entry.student_id) === selectedStudent.id
              );
              if (!match || typeof match.status !== "string") {
                return null;
              }
              const status = match.status.toLowerCase() as AttendanceStatus;
              if (status !== "present" && status !== "absent" && status !== "late") {
                return null;
              }
              return { record, status };
            } catch {
              return null;
            }
          })
          .filter(
            (item): item is { record: ClassAttendanceRecord; status: AttendanceStatus } =>
              item !== null
          )
          .sort(
            (a, b) =>
              new Date(b.record.date_logged).getTime() -
              new Date(a.record.date_logged).getTime()
          );

        setAttendanceRecords(entries);
      } catch (error) {
        if (isActive) {
          const message = error instanceof Error ? error.message : "Unable to load attendance.";
          setAttendanceError(message);
          setAttendanceRecords([]);
        }
      } finally {
        if (isActive) {
          setAttendanceLoading(false);
        }
      }
    };

    setActiveTab("details");
    setAttendanceRecords([]);
    setAttendanceError(null);

    if (selectedStudent) {
      loadAttendanceRecords();
    }

    return () => {
      isActive = false;
    };
  }, [selectedClass, selectedStudent, teacherId]);

  const closeStudentModal = () => {
    setSelectedStudent(null);
  };

  const normalizeNotes = (items: StudentNote[]) =>
    [...items].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

  const formatLogDate = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return value;
  };

  const mapApiNote = (note: ApiStudentNote): StudentNote => ({
    id: String(note.id),
    text: note.note,
    createdAt: note.created_at,
    updatedAt: note.updated_at || note.created_at,
    title: note.title ?? undefined,
  });

  const formatNoteDate = (value: string) => {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return value;
  };

  const handleSaveNote = async () => {
    if (!selectedStudent || !teacherId) {
      return;
    }
    const trimmed = noteDraft.trim();
    if (!trimmed) {
      return;
    }
    setNotesSaving(true);
    setNotesError(null);
    try {
      const response = await saveStudentNote({
        teacherId,
        studentId: selectedStudent.id,
        note: trimmed,
        noteId: editingNoteId ?? undefined,
      });
      const saved = response.data ? mapApiNote(response.data) : null;
      if (!saved) {
        throw new Error("Unable to save note.");
      }
      const nextNotes = normalizeNotes(
        editingNoteId
          ? notes.map((note) => (note.id === saved.id ? saved : note))
          : [saved, ...notes]
      );
      setNotes(nextNotes);
      setNoteDraft("");
      setEditingNoteId(null);
      setShowNoteEditor(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save note.";
      setNotesError(message);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleEditNote = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setNoteDraft(note.text);
    setShowNoteEditor(true);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNoteDraft("");
    setShowNoteEditor(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedStudent || !teacherId) {
      return;
    }
    setNotesSaving(true);
    setNotesError(null);
    try {
      await deleteStudentNote({
        teacherId,
        studentId: selectedStudent.id,
        noteId,
      });
      const nextNotes = notes.filter((note) => note.id !== noteId);
      setNotes(nextNotes);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete note.";
      setNotesError(message);
    } finally {
      setNotesSaving(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!selectedStudent || !teacherId) {
        return;
      }
      setNotesLoading(true);
      setNotesError(null);
      try {
        const response = await getStudentNotes(teacherId, selectedStudent.id);
        if (!isActive) {
          return;
        }
        const incoming = response.data ?? [];
        setNotes(normalizeNotes(incoming.map(mapApiNote)));
      } catch (error) {
        if (isActive) {
          const message =
            error instanceof Error ? error.message : "Unable to load notes.";
          setNotesError(message);
          setNotes([]);
        }
      } finally {
        if (isActive) {
          setNotesLoading(false);
        }
      }
    };

    setNotes([]);
    setNotesError(null);
    setNoteDraft("");
    setEditingNoteId(null);
    setShowNoteEditor(false);

    if (selectedStudent) {
      load();
    }

    return () => {
      isActive = false;
    };
  }, [selectedStudent, teacherId]);

  const detailBorderStyle =
    selectedStudent?.gender?.toLowerCase() === "female"
      ? styles.detailSectionFemale
      : selectedStudent?.gender?.toLowerCase() === "male"
      ? styles.detailSectionMale
      : styles.detailSectionNeutral;


  if (!selectedClass) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="albums-outline" size={36} color="#E8ECEF" />
        <Text style={styles.emptyTitle}>No class selected</Text>
        <Text style={styles.emptySubtitle}>Pick a class to view its section roster.</Text>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={onBack}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
            Back to Classes
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
          <Text style={[styles.backButtonText, { color: theme.colors.text }]}>Classes</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={onStartAttendance}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
              Take Attendance
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toolsButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => setShowToolsMenu((prev) => !prev)}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={theme.colors.text} />
          </Pressable>
          {showToolsMenu ? (
            <View
              style={[
                styles.toolsMenu,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              {classRoster.length === 0 ? (
                <View style={styles.toolsMenuItem}>
                  <Text style={styles.toolsMenuText}>No students in roster.</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.toolsMenuItem}
                  onPress={() => {
                    setShowToolsMenu(false);
                    setShowRoulette(true);
                  }}
                >
                  <Text style={styles.toolsMenuText}>Student roulette</Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.sectionCard,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {classMeta.section || "Section"}
        </Text>
        {classMeta.subject ? (
          <View style={styles.metaRow}>
            <Ionicons name="book-outline" size={14} color={theme.colors.text} />
            <Text style={[styles.metaText, { color: theme.colors.text }]}>{classMeta.subject}</Text>
          </View>
        ) : null}
        {classMeta.time ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.text} />
            <Text style={[styles.metaText, { color: theme.colors.text }]}>{classMeta.time}</Text>
          </View>
        ) : null}
        <Text style={[styles.countText, { color: theme.colors.text }]}>
          {classRoster.length} students
        </Text>
      </View>

      <Text style={[styles.listTitle, { color: theme.colors.text }]}>Student List</Text>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {classRoster.map((student) => (
          <Pressable
            key={student.id}
            style={[
              styles.studentRow,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              student.gender?.toLowerCase() === "female"
                ? [styles.studentRowFemale, { borderColor: theme.colors.accent }]
                : student.gender?.toLowerCase() === "male"
                ? [styles.studentRowMale, { borderColor: theme.colors.secondary }]
                : styles.studentRowNeutral,
            ]}
            onPress={() => setSelectedStudent(student)}
          >
            <View style={[styles.studentAvatar, { backgroundColor: theme.colors.background }]}>
              {student.cardImage ? (
                <Image
                  source={{ uri: student.cardImage }}
                  style={styles.studentAvatarImage}
                />
              ) : (
                <Ionicons name="person-outline" size={18} color={theme.colors.text} />
              )}
            </View>
            <View style={styles.studentMeta}>
              <Text style={[styles.studentName, { color: theme.colors.text }]}>
                {student.fullName}
              </Text>
              {student.cardNumber ? (
                <Text style={[styles.studentSub, { color: theme.colors.text }]}>
                  Card: {student.cardNumber}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
        {classRoster.length === 0 ? (
          <View style={styles.emptyRoster}>
            <Text style={styles.emptySubtitle}>No students found in this section.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal transparent visible={!!selectedStudent} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeStudentModal}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                {selectedStudent?.cardImage ? (
                  <Image
                    source={{ uri: selectedStudent.cardImage }}
                    style={styles.modalAvatarImage}
                  />
                ) : (
                  <Ionicons name="person-outline" size={22} color="#6B7D8F" />
                )}
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalName}>
                  {selectedStudent?.fullName || "Student"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedStudent?.assignedSection || classMeta.section || "Section"}
                </Text>
              </View>
              <Pressable style={styles.modalClose} onPress={closeStudentModal}>
                <Ionicons name="close" size={18} color="#6B7D8F" />
              </Pressable>
            </View>

            <View style={styles.modalTabs}>
              <Pressable
                style={[
                  styles.modalTab,
                  activeTab === "attendance" && styles.modalTabActive,
                ]}
                onPress={() => setActiveTab("attendance")}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    activeTab === "attendance" && styles.modalTabTextActive,
                  ]}
                >
                  Attendance
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalTab, activeTab === "details" && styles.modalTabActive]}
                onPress={() => setActiveTab("details")}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    activeTab === "details" && styles.modalTabTextActive,
                  ]}
                >
                  Personal Details
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalTab, activeTab === "notes" && styles.modalTabActive]}
                onPress={() => setActiveTab("notes")}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    activeTab === "notes" && styles.modalTabTextActive,
                  ]}
                >
                  Anecdotal Notes
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === "attendance" ? (
                <View style={styles.modalSection}>
                  {attendanceLoading ? (
                    <Text style={styles.modalHint}>Loading attendance...</Text>
                  ) : attendanceError ? (
                    <Text style={styles.modalHint}>{attendanceError}</Text>
                  ) : attendanceRecords.length === 0 ? (
                    <Text style={styles.modalHint}>No attendance records yet.</Text>
                  ) : (
                    <View style={styles.detailList}>
                      {attendanceRecords.map(({ record, status }) => {
                        const subject = record.subject?.trim() || record.subject_name?.trim() || "";
                        const section = record.assigned_section || record.section_name || "";
                        const title = [subject, formatLogDate(record.date_logged)]
                          .filter((value) => value)
                          .join(" • ");
                        return (
                          <View key={record.id} style={styles.detailRow}>
                            <View style={styles.detailMeta}>
                              <Text style={styles.detailName}>
                                {title || "Attendance Record"}
                              </Text>
                              <Text style={styles.detailSub}>
                                {section || "Section"}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.detailStatusChip,
                                status === "present"
                                  ? styles.detailStatusPresent
                                  : status === "absent"
                                  ? styles.detailStatusAbsent
                                  : styles.detailStatusLate,
                              ]}
                            >
                              <Text style={styles.detailStatusText}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              {activeTab === "details" ? (
                <View style={[styles.modalSection, styles.detailSection, detailBorderStyle]}>
                  <View style={styles.modalRow}>
                    <Ionicons name="call-outline" size={16} color="#6B7D8F" />
                    <Pressable
                      style={styles.emergencyContact}
                      onPress={handleCopyEmergencyContact}
                    >
                      <Text style={styles.emergencyLabel}>Emergency Contact</Text>
                      <Text
                        style={styles.emergencyValue}
                        selectable={Boolean(selectedStudent?.parentMobile)}
                      >
                        {selectedStudent?.parentMobile || "N/A"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.copyButton,
                        !selectedStudent?.parentMobile && styles.copyButtonDisabled,
                      ]}
                      onPress={handleCopyEmergencyContact}
                      disabled={!selectedStudent?.parentMobile}
                      accessibilityRole="button"
                      accessibilityLabel="Copy emergency contact"
                    >
                      <Ionicons name="copy-outline" size={14} color="#1A2B3C" />
                    </Pressable>
                  </View>
                  {copyFeedback ? (
                    <Text style={styles.copyToast}>{copyFeedback}</Text>
                  ) : null}
                </View>
              ) : null}

              {activeTab === "notes" ? (
                <View style={styles.modalSection}>
                  <Text style={styles.notePrivacyHint}>Only you can see this</Text>
                  {notesLoading ? (
                    <Text style={styles.modalHint}>Loading notes...</Text>
                  ) : notesError ? (
                    <Text style={styles.modalHint}>{notesError}</Text>
                  ) : notes.length === 0 ? (
                    <Text style={styles.modalHint}>No notes yet. Tap New Note to add one.</Text>
                  ) : (
                    <View style={styles.notesList}>
                      {notes.map((note) => (
                        <View key={note.id} style={styles.noteCard}>
                          <Text style={styles.noteText}>{note.text}</Text>
                          <View style={styles.noteFooter}>
                            <Text style={styles.noteDate}>
                              {formatNoteDate(note.updatedAt)}
                            </Text>
                            <View style={styles.noteFooterActions}>
                              <Pressable
                                style={styles.noteIconButton}
                                onPress={() => handleEditNote(note)}
                              >
                                <Ionicons name="create-outline" size={14} color="#1A2B3C" />
                              </Pressable>
                              <Pressable
                                style={styles.noteIconButton}
                                onPress={() => handleDeleteNote(note.id)}
                              >
                                <Ionicons name="trash-outline" size={14} color="#B42318" />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {showNoteEditor ? (
                    <>
                      <Text style={styles.noteEditorLabel}>
                        {editingNoteId ? "Editing note" : "New note"}
                      </Text>
                      <TextInput
                        value={noteDraft}
                        onChangeText={setNoteDraft}
                        placeholder="Write a note about this student..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        style={styles.noteInput}
                      />
                      <View style={styles.noteActions}>
                        <Pressable style={styles.noteGhostButton} onPress={handleCancelEdit}>
                          <Text style={styles.noteGhostButtonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.notePrimaryButton,
                            (!noteDraft.trim() || notesSaving) && styles.notePrimaryButtonDisabled,
                          ]}
                          onPress={handleSaveNote}
                          disabled={!noteDraft.trim() || notesSaving}
                        >
                          <Text style={styles.notePrimaryButtonText}>
                            {editingNoteId ? "Update Note" : "Save Note"}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <Pressable
                      style={styles.noteNewButton}
                      onPress={() => {
                        setNoteDraft("");
                        setEditingNoteId(null);
                        setShowNoteEditor(true);
                      }}
                    >
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.noteNewButtonText}>New Note</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={showRoulette} animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeRoulette}>
          <Pressable style={styles.rouletteCard} onPress={() => {}}>
            <View style={styles.rouletteHeader}>
              <View style={styles.rouletteHeaderIcon}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.rouletteHeaderText}>
                <Text style={styles.rouletteTitle}>Student Roulette</Text>
                <Text style={styles.rouletteSubtitle}>
                  Randomly select a student from your class
                </Text>
              </View>
              <Pressable style={styles.rouletteClose} onPress={closeRoulette}>
                <Ionicons name="close" size={16} color="#E2E8F0" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.rouletteBody}
              contentContainerStyle={styles.rouletteBodyContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.rouletteFocus}>
                <View style={styles.rouletteFocusAvatar}>
                  {rouletteStudents[rouletteIndex]?.cardImage ? (
                    <Image
                      source={{ uri: rouletteStudents[rouletteIndex].cardImage || "" }}
                      style={styles.rouletteAvatarImage}
                    />
                  ) : (
                    <Text style={styles.rouletteFocusInitial}>
                      {getInitials(rouletteNames[rouletteIndex] || "")}
                    </Text>
                  )}
                </View>
                <Text style={styles.rouletteName}>
                  {rouletteNames[rouletteIndex] || "No students"}
                </Text>
                <Text style={styles.rouletteHint}>
                  {rouletteSpinning
                    ? "Selecting..."
                    : rouletteWinner
                    ? "Selected"
                    : "Tap Select"}
                </Text>
              </View>

              <View style={styles.rouletteListHeader}>
                <Ionicons name="people-outline" size={16} color="#2563EB" />
                <Text style={styles.rouletteListTitle}>
                  All Students ({rouletteNames.length})
                </Text>
              </View>
              <View style={styles.rouletteListCard}>
                <View style={styles.rouletteList}>
                  {rouletteNames.map((name, index) => {
                    const isActive = index === rouletteIndex;
                    return (
                      <View
                        key={`${index}-${name}`}
                        style={[
                          styles.rouletteItem,
                          isActive && styles.rouletteItemActive,
                        ]}
                      >
                        <View style={styles.rouletteItemAvatar}>
                          {rouletteStudents[index]?.cardImage ? (
                            <Image
                              source={{ uri: rouletteStudents[index].cardImage || "" }}
                              style={styles.rouletteAvatarImage}
                            />
                          ) : (
                            <Text style={styles.rouletteItemInitial}>
                              {getInitials(name)}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.rouletteItemText,
                            isActive && styles.rouletteItemTextActive,
                          ]}
                        >
                          {name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <Pressable
              style={[
                styles.rouletteButton,
                (rouletteSpinning || rouletteNames.length === 0) &&
                  styles.rouletteButtonDisabled,
              ]}
              onPress={spinRoulette}
              disabled={rouletteSpinning || rouletteNames.length === 0}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.rouletteButtonText}>
                {rouletteSpinning ? "Selecting..." : "Select Again"}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

    </View>
  );
};


const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
 backButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryButton: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  toolsButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  toolsMenu: {
    position: "absolute",
    top: 38,
    right: 0,
    minWidth: 220,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    zIndex: 20,
  },
  toolsMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolsMenuText: {
    fontSize: 12,
    color: "#1A2B3C",
    fontWeight: "600",
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 12,
  },
  countText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  list: {
    gap: 10,
    paddingBottom: 16,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  studentRowFemale: {
    borderColor: "#F6C1D8",
  },
  studentRowMale: {
    borderColor: "#BFD7F5",
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
  studentMeta: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentSub: {
    fontSize: 11,
    marginTop: 4,
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
  emptyRoster: {
    alignItems: "center",
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
  },
  rouletteCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    padding: 16,
    maxHeight: "80%",
  },
  rouletteHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rouletteHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rouletteHeaderText: {
    flex: 1,
  },
  rouletteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rouletteSubtitle: {
    fontSize: 11,
    color: "#DBEAFE",
    marginTop: 4,
  },
  rouletteClose: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  rouletteBody: {
    maxHeight: 420,
  },
  rouletteBodyContent: {
    paddingBottom: 8,
  },
  rouletteFocus: {
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    padding: 16,
  },
  rouletteFocusAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    overflow: "hidden",
  },
  rouletteFocusInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  rouletteName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B3C",
    textAlign: "center",
  },
  rouletteHint: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 4,
    marginBottom: 2,
  },
  rouletteResult: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A2B3C",
    textAlign: "center",
    marginBottom: 8,
  },
  rouletteListHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  rouletteListTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  rouletteListCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  rouletteList: {
    paddingVertical: 6,
  },
  rouletteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  rouletteItemActive: {
    backgroundColor: "#EFF6FF",
  },
  rouletteItemAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rouletteAvatarImage: {
    width: "100%",
    height: "100%",
  },
  rouletteItemInitial: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  rouletteItemText: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
  },
  rouletteItemTextActive: {
    fontWeight: "700",
    color: "#1D4ED8",
  },
  rouletteButton: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  rouletteButtonDisabled: {
    opacity: 0.6,
  },
  rouletteButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalAvatarImage: {
    width: "100%",
    height: "100%",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7D8F",
    marginTop: 2,
  },
  modalClose: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  modalTabs: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 14,
  },
  modalTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  modalTabActive: {
    backgroundColor: "#FFFFFF",
  },
  modalTabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7D8F",
  },
  modalTabTextActive: {
    color: "#1A2B3C",
  },
  modalBody: {
    minHeight: 120,
  },
  modalBodyContent: {
    paddingBottom: 6,
    gap: 8,
  },
  modalSection: {
    gap: 8,
  },
  detailSection: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 10,
  },
  detailSectionNeutral: {
    borderColor: "#E2E8F0",
  },
  detailSectionFemale: {
    // borderColor: "#E86AA5",
    // backgroundColor: "#FDF2F8",
  },
  detailSectionMale: {
    borderColor: "#4A90E2",
    backgroundColor: "#EFF6FF",
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  modalText: {
    fontSize: 12,
    color: "#1A2B3C",
    flex: 1,
  },
  emergencyContact: {
    flex: 1,
  },
  emergencyLabel: {
    fontSize: 11,
    color: "#6B7D8F",
    fontWeight: "600",
  },
  emergencyValue: {
    fontSize: 12,
    color: "#1A2B3C",
    fontWeight: "700",
    marginTop: 2,
  },
  copyButton: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  copyButtonDisabled: {
    opacity: 0.45,
  },
  copyToast: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 6,
  },
  modalHint: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  noteInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 12,
    color: "#1A2B3C",
    textAlignVertical: "top",
    backgroundColor: "#FFFFFF",
  },
  noteEditorLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  notePrivacyHint: {
    fontSize: 11,
    color: "#94A3B8",
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  noteNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#2C77BC",
  },
  noteNewButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  notePrimaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#2C77BC",
  },
  notePrimaryButtonDisabled: {
    opacity: 0.6,
  },
  notePrimaryButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noteGhostButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  noteGhostButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  notesList: {
    gap: 10,
  },
  noteCard: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  noteText: {
    fontSize: 12,
    color: "#1A2B3C",
    lineHeight: 18,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteDate: {
    fontSize: 10,
    color: "#6B7D8F",
  },
  noteFooterActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteIconButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  detailList: {
    borderTopWidth: 1,
    borderTopColor: "#EEF2F5",
    paddingTop: 10,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailMeta: {
    flex: 1,
  },
  detailName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  detailSub: {
    fontSize: 11,
    color: "#6B7D8F",
    marginTop: 2,
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
});

export default SectionDetailsScreen;
