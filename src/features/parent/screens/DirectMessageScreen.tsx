import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import Card from "../components/Card";
import {
  fetchParentMessageHistory,
  submitExcuseLetter,
  ParentMessageHistoryItem,
} from "../api/parent/excuseLetters";
import { fetchStudentTeachers } from "../api/parent/teachers";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Teacher = {
  id: string;
  name: string;
  subject: string;
  presenceId?: string;
};

type Props = {
  selectedChildId: string;
  childOptions: Array<{ id: string; label: string }>;
  selectedChildName: string;
  initialSelectedChildIds?: string[];
  initialSelectedTeacherIds?: string[];
  onPrefillApplied?: () => void;
  teacherPresence: Record<string, { status: string; timestamp: string }>;
};

type MessageHistoryItem = {
  id: string;
  childName: string;
  type: "excuse_letter" | "message";
  dateFrom: string | null;
  dateTo: string | null;
  reason: string;
  message: string;
  teacherResponse?: string | null;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  teacherNames: string[];
};

const CONCERN_OPTIONS = [
  "General Question",
  "Enrollment Concern",
  "Billing Concern",
  "Technical Support",
  "Excuse Letter",
  "Other",
];

const EXCUSE_REASON_OPTIONS = [
  "Medical",
  "Family Emergency",
  "Medical Appointment",
  "Religious Observance",
  "Family Event",
  "Other",
];

const DirectMessageScreen = ({
  selectedChildId,
  childOptions,
  selectedChildName,
  initialSelectedChildIds,
  initialSelectedTeacherIds,
  onPrefillApplied,
  teacherPresence,
}: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const HISTORY_PAGE_SIZE = 3;
  const initialFormData = {
    dateFrom: "",
    dateTo: "",
    concern: "General Question",
    reason: "Medical",
    customReason: "",
    message: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    selectedChildId !== "all" ? [selectedChildId] : []
  );
  const [hasManualSelection, setHasManualSelection] = useState(false);
  const [dateFromValue, setDateFromValue] = useState<Date | null>(null);
  const [dateToValue, setDateToValue] = useState<Date | null>(null);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [isStudentMenuOpen, setIsStudentMenuOpen] = useState(false);
  const [isTeacherMenuOpen, setIsTeacherMenuOpen] = useState(false);
  const [isConcernMenuOpen, setIsConcernMenuOpen] = useState(false);
  const [isReasonMenuOpen, setIsReasonMenuOpen] = useState(false);
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    title: string;
    message: string;
    details: string;
    variant: "success" | "info";
  }>({
    visible: false,
    title: "",
    message: "",
    details: "",
    variant: "success",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersByChildId, setTeachersByChildId] = useState<Record<string, Teacher[]>>({});
  const [isTeachersLoading, setIsTeachersLoading] = useState(false);
  const prefillSelectionRef = useRef<{ teacherIds: string[] } | null>(null);
  const prefillKeyRef = useRef<string | null>(null);
  const [historyItems, setHistoryItems] = useState<MessageHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"all" | "message" | "excuse_letter">("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [isAfterCutoff, setIsAfterCutoff] = useState(false);

  const isAfterMessagingCutoff = () => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
    const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
    return hour > 19 || (hour === 19 && minute >= 0);
  };

  const formatDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

  const resetForm = () => {
    setFormData(initialFormData);
    setDateFromValue(null);
    setDateToValue(null);
    setSelectedTeachers([]);
    setTeacherSearch("");
    setSelectedChildIds([]);
    setHasManualSelection(false);
  };
  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const childOptionsForSelection = useMemo(() => {
    const list = Array.isArray(childOptions) ? childOptions : [];
    if (list.length > 0) {
      return list;
    }
    return [
      { id: "all", label: "All Children" },
      { id: selectedChildId, label: selectedChildName },
    ];
  }, [childOptions, selectedChildId, selectedChildName]);

  const childSelectionLabel = useMemo(() => {
    if (selectedChildIds.includes("all")) {
      return "All Children";
    }
    if (selectedChildIds.length === 1) {
      const child = childOptionsForSelection.find((option) => option.id === selectedChildIds[0]);
      return child?.label ?? "Selected Child";
    }
    if (selectedChildIds.length > 1) {
      return `${selectedChildIds.length} Children Selected`;
    }
    return "Select Students";
  }, [childOptionsForSelection, selectedChildIds]);

  useEffect(() => {
    setIsAfterCutoff(isAfterMessagingCutoff());
  }, []);

  useEffect(() => {
    if (selectedChildId === "all") {
      setSelectedChildIds([]);
    } else {
      setSelectedChildIds([selectedChildId]);
    }
  }, [selectedChildId]);

  useEffect(() => {
    const fetchTeachers = async () => {
      setIsTeachersLoading(true);
      try {
        const teachersByChild = await Promise.all(
          selectedChildIds.map((childId) => fetchStudentTeachers(childId))
        );
        const map: Record<string, Teacher[]> = {};
        teachersByChild.forEach((result, index) => {
          const childId = selectedChildIds[index];
          map[childId] = result?.teachers ?? [];
        });
        setTeachersByChildId(map);
        const combined = teachersByChild.flatMap((t) => t?.teachers ?? []);
        setTeachers(combined);
      } catch (error) {
        setTeachers([]);
      } finally {
        setIsTeachersLoading(false);
      }
    };
    if (selectedChildIds.length > 0) {
      fetchTeachers();
    } else {
      setTeachers([]);
    }
  }, [selectedChildIds]);

  useEffect(() => {
    const applyPrefill = () => {
      if (!initialSelectedChildIds && !initialSelectedTeacherIds) return;
      const key = `${(initialSelectedChildIds ?? []).join(",")}|${(initialSelectedTeacherIds ?? []).join(",")}`;
      if (prefillKeyRef.current === key) return;
      prefillKeyRef.current = key;
      setSelectedChildIds(initialSelectedChildIds ?? []);
      setSelectedTeachers(initialSelectedTeacherIds ?? []);
      setHasManualSelection(true);
      onPrefillApplied?.();
    };
    applyPrefill();
  }, [initialSelectedChildIds, initialSelectedTeacherIds, onPrefillApplied]);

  useEffect(() => {
    const loadHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const response = await fetchParentMessageHistory({
          childId: selectedChildId,
          type: historyTab === "all" ? "all" : historyTab,
          page: 1,
          perPage: HISTORY_PAGE_SIZE,
        });
        const items =
          response?.letters?.map((letter) => ({
            id: String(letter.id),
            childName: letter.child_name,
            type: letter.type,
            dateFrom: letter.date_from,
            dateTo: letter.date_to,
            reason: letter.reason,
            message: letter.message,
            teacherResponse: letter.teacher_response,
            status: letter.status,
            submittedAt: letter.submitted_at,
            teacherNames: letter.teacher_names ?? [],
          })) ?? [];
        setHistoryItems(items);
        setHistoryPage(1);
        setHistoryHasMore(items.length === HISTORY_PAGE_SIZE);
        setHistoryError(null);
      } catch (error) {
        setHistoryError("Failed to load history.");
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, [selectedChildId, historyTab]);

  const loadMoreHistory = async () => {
    if (!historyHasMore || isHistoryLoadingMore) return;
    setIsHistoryLoadingMore(true);
    try {
      const nextPage = historyPage + 1;
      const response = await fetchParentMessageHistory({
        childId: selectedChildId,
        type: historyTab === "all" ? "all" : historyTab,
        page: nextPage,
        perPage: HISTORY_PAGE_SIZE,
      });
      const items =
        response?.letters?.map((letter) => ({
          id: String(letter.id),
          childName: letter.child_name,
          type: letter.type,
          dateFrom: letter.date_from,
          dateTo: letter.date_to,
          reason: letter.reason,
          message: letter.message,
          teacherResponse: letter.teacher_response,
          status: letter.status,
          submittedAt: letter.submitted_at,
          teacherNames: letter.teacher_names ?? [],
        })) ?? [];
      setHistoryItems((prev) => [...prev, ...items]);
      setHistoryPage(nextPage);
      setHistoryHasMore(items.length === HISTORY_PAGE_SIZE);
    } catch {
      setHistoryHasMore(false);
    } finally {
      setIsHistoryLoadingMore(false);
    }
  };

  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      }
      return [...prev, teacherId];
    });
    setHasManualSelection(true);
  };

  const handleSelectStudent = (childId: string) => {
    setSelectedChildIds((prev) => {
      if (prev.includes(childId)) {
        return prev.filter((id) => id !== childId);
      }
      return [...prev, childId];
    });
    setHasManualSelection(true);
  };

  const handleSubmit = async () => {
    if (selectedChildIds.length === 0) {
      setFeedback({
        visible: true,
        title: "Student required",
        message: "Please select a student before sending.",
        details: "",
        variant: "info",
      });
      return;
    }

    if (selectedChildIds.length > 1 || selectedChildIds.includes("all")) {
      setFeedback({
        visible: true,
        title: "One student at a time",
        message: "Please choose a single student to message for now.",
        details: "",
        variant: "info",
      });
      return;
    }

    if (selectedTeachers.length === 0) {
      setFeedback({
        visible: true,
        title: "Teacher required",
        message: "Select at least one teacher to notify.",
        details: "",
        variant: "info",
      });
      return;
    }

    if (!formData.message.trim()) {
      setFeedback({
        visible: true,
        title: "Message required",
        message: "Please write your message before sending.",
        details: "",
        variant: "info",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await submitExcuseLetter({
        childId: selectedChildIds[0],
        teacherIds: selectedTeachers,
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        reason: formData.concern || formData.reason,
        message: formData.message,
      });
      if (!response?.success) {
        throw new Error(response?.message || "Unable to send the message.");
      }
      setFeedback({
        visible: true,
        title: "Message sent",
        message: "Your message has been sent to the selected teacher(s).",
        details: "",
        variant: "success",
      });
      resetForm();
    } catch (error) {
      setFeedback({
        visible: true,
        title: "Failed to send",
        message: error instanceof Error ? error.message : "Something went wrong.",
        details: "",
        variant: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const teacherPresenceLabel = (teacherId: string) => {
    const presence = teacherPresence[teacherId];
    return presence?.status ?? "Offline";
  };

  const teacherPresenceColor = (teacherId: string) => {
    const presence = teacherPresence[teacherId];
    if (!presence) return `${theme.colors.text}66`;
    if (presence.status === "Available") return "#22C55E";
    if (presence.status === "Busy") return theme.colors.accent;
    return `${theme.colors.text}99`;
  };

  const renderTeacher = (teacher: Teacher) => {
    const isSelected = selectedTeachers.includes(teacher.id);
    const presenceLabel = teacherPresenceLabel(teacher.presenceId ?? teacher.id);
    const presenceColor = teacherPresenceColor(teacher.presenceId ?? teacher.id);

    return (
      <Pressable
        key={teacher.id}
        style={[
          styles.teacherRow,
          isSelected && { backgroundColor: `${theme.colors.primary}12`, borderColor: theme.colors.primary },
        ]}
        onPress={() => handleSelectTeacher(teacher.id)}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: theme.colors.primary },
            isSelected && { backgroundColor: theme.colors.primary },
          ]}
        >
          {isSelected ? <Ionicons name="checkmark" size={14} color={theme.colors.surface} /> : null}
        </View>
        <View style={styles.teacherInfo}>
          <View style={styles.teacherTopRow}>
            <Text style={styles.teacherName} numberOfLines={1}>
              {teacher.name}
            </Text>
            <View style={styles.presenceRow}>
              <View style={[styles.presenceDot, { backgroundColor: presenceColor }]} />
              <Text style={styles.presenceText}>{presenceLabel}</Text>
            </View>
          </View>
          <View style={styles.teacherMeta}>
            <Text style={styles.teacherSubject} numberOfLines={1}>
              {teacher.subject}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const renderDropdown = (label: string, value: string, isOpen: boolean, onToggle: () => void, options: string[], onSelect: (option: string) => void) => (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dropdownTrigger} onPress={onToggle}>
        <Text style={styles.dropdownTriggerText}>{value}</Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.primary} />
      </Pressable>
      {isOpen ? (
        <View style={styles.dropdownMenu}>
          <ScrollView style={styles.dropdownList} nestedScrollEnabled>
            {options.map((option, index) => (
              <Pressable
                key={option}
                style={[
                  styles.dropdownItem,
                  index === options.length - 1 && styles.dropdownItemLast,
                  value === option && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(option);
                  onToggle();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    value === option && styles.dropdownItemTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  const content = (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Send a Message</Text>
        <Text style={styles.subtitle}>For {selectedChildName}</Text>
        <Text style={styles.headerHint}>
          Choose a concern, then write your message. For an excuse letter, add the dates.
        </Text>
      </View>

      {renderDropdown(
        "Concern *",
        formData.concern,
        isConcernMenuOpen,
        () => setIsConcernMenuOpen((prev) => !prev),
        CONCERN_OPTIONS,
        (value) => setFormData((prev) => ({ ...prev, concern: value }))
      )}

      {renderDropdown(
        "Select Students *",
        childSelectionLabel,
        isStudentMenuOpen,
        () => setIsStudentMenuOpen((prev) => !prev),
        childOptionsForSelection.map((option) => option.label),
        (label) => {
          const option = childOptionsForSelection.find((opt) => opt.label === label);
          if (!option) return;
          handleSelectStudent(option.id);
        }
      )}

      {renderDropdown(
        "Select Teachers *",
        selectedTeachers.length === 0
          ? "Select teachers"
          : `${selectedTeachers.length} selected`,
        isTeacherMenuOpen,
        () => setIsTeacherMenuOpen((prev) => !prev),
        teachers.map((teacher) => teacher.name),
        (name) => {
          const teacher = teachers.find((t) => t.name === name);
          if (teacher) handleSelectTeacher(teacher.id);
        }
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Message *</Text>
        <TextInput
          placeholder="Write your message here."
          placeholderTextColor={`${theme.colors.text}99`}
          value={formData.message}
          onChangeText={(text) => setFormData((prev) => ({ ...prev, message: text }))}
          style={[styles.input, styles.textArea]}
          multiline
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Dates (optional)</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={[styles.input, { flex: 1, justifyContent: "center" }]}
            onPress={() => setShowDateFromPicker(true)}
          >
            <Text style={styles.dropdownTriggerText}>
              {formData.dateFrom ? formData.dateFrom : "Date from"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.input, { flex: 1, justifyContent: "center" }]}
            onPress={() => setShowDateToPicker(true)}
          >
            <Text style={styles.dropdownTriggerText}>
              {formData.dateTo ? formData.dateTo : "Date to"}
            </Text>
          </Pressable>
        </View>
        {showDateFromPicker ? (
          <DateTimePicker
            value={dateFromValue || today}
            mode="date"
            display="default"
            onChange={(_event: DateTimePickerEvent, date) => {
              setShowDateFromPicker(false);
              if (date) {
                setDateFromValue(date);
                setFormData((prev) => ({ ...prev, dateFrom: formatDate(date) }));
              }
            }}
          />
        ) : null}
        {showDateToPicker ? (
          <DateTimePicker
            value={dateToValue || today}
            mode="date"
            display="default"
            onChange={(_event: DateTimePickerEvent, date) => {
              setShowDateToPicker(false);
              if (date) {
                setDateToValue(date);
                setFormData((prev) => ({ ...prev, dateTo: formatDate(date) }));
              }
            }}
          />
        ) : null}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Helpful Tips</Text>
        <Text style={styles.infoText}>- Use Excuse Letter to add dates and an absence reason.</Text>
        <Text style={styles.infoText}>- If you can, send excuse letters 24 hours ahead.</Text>
        <Text style={styles.infoText}>- Medical absences over 3 days may need a doctor's note.</Text>
      </View>

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Ionicons name="paper-plane-outline" size={18} color={theme.colors.surface} />
        <Text style={styles.submitText}>{isSubmitting ? "Sending..." : "Send Message"}</Text>
      </Pressable>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>History</Text>
        <View style={styles.historyTabs}>
          {["all", "message", "excuse_letter"].map((tab) => {
            const isActive = historyTab === tab;
            return (
              <Pressable
                key={tab}
                style={[
                  styles.historyTab,
                  isActive && styles.historyTabActive,
                ]}
                onPress={() => setHistoryTab(tab as typeof historyTab)}
              >
                <Text
                  style={[
                    styles.historyTabText,
                    isActive && styles.historyTabTextActive,
                  ]}
                >
                  {tab === "excuse_letter" ? "Excuse Letters" : tab === "message" ? "Messages" : "All"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isHistoryLoading ? (
          <Text style={styles.historyEmpty}>Loading history...</Text>
        ) : historyItems.length === 0 ? (
          <Text style={styles.historyEmpty}>No history yet.</Text>
        ) : (
          historyItems.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historySubject}>{item.type === "excuse_letter" ? "Excuse Letter" : "Message"}</Text>
                <Text style={styles.historyStatus}>{item.status}</Text>
              </View>
              <Text style={styles.historyMeta}>
                {item.childName} • {item.teacherNames.join(", ")} • {item.submittedAt}
              </Text>
              <Text style={styles.historyMessage}>{item.message}</Text>
              {item.teacherResponse ? (
                <View style={styles.historyReply}>
                  <Text style={styles.historyReplyLabel}>Teacher response</Text>
                  <Text style={styles.historyReplyText}>{item.teacherResponse}</Text>
                </View>
              ) : null}
            </View>
          ))
        )}

        {historyHasMore ? (
          <Pressable style={styles.historyLoadMore} onPress={loadMoreHistory}>
            <Text style={styles.historyLoadMoreText}>
              {isHistoryLoadingMore ? "Loading..." : "Load more"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Modal transparent visible={feedback.visible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View
              style={[
                styles.modalIconWrap,
                feedback.variant === "success" ? styles.modalIconSuccess : styles.modalIconInfo,
              ]}
            >
              <Ionicons
                name={feedback.variant === "success" ? "checkmark" : "information"}
                size={20}
                color={theme.colors.surface}
              />
            </View>
            <Text style={styles.modalTitle}>{feedback.title}</Text>
            <Text style={styles.modalMessage}>{feedback.message}</Text>
            {feedback.details ? <Text style={styles.modalDetails}>{feedback.details}</Text> : null}
            <Pressable
              style={[
                styles.modalButton,
                feedback.variant === "success" ? styles.modalButtonSuccess : styles.modalButtonInfo,
              ]}
              onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );

  return Platform.OS === "ios" ? (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      {content}
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.screen}>{content}</View>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) => {
  const colors = theme.colors;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 20,
      paddingTop: 12,
      backgroundColor: colors.background,
      gap: 14,
    },
    header: {
      gap: 6,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 13,
      fontWeight: "600",
      color: `${colors.text}cc`,
    },
    headerHint: {
      fontSize: 12,
      color: `${colors.text}99`,
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
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      alignItems: "center",
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    modalIconSuccess: {
      backgroundColor: colors.primary,
    },
    modalIconInfo: {
      backgroundColor: colors.primary,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 6,
    },
    modalMessage: {
      fontSize: 12,
      color: `${colors.text}99`,
      textAlign: "center",
      marginBottom: 10,
    },
    modalDetails: {
      fontSize: 11,
      color: `${colors.text}99`,
      textAlign: "center",
      marginBottom: 14,
    },
    modalButton: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 10,
      alignSelf: "stretch",
      alignItems: "center",
    },
    modalButtonSuccess: {
      backgroundColor: colors.primary,
    },
    modalButtonInfo: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: "700",
    },
    section: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    textArea: {
      minHeight: 110,
      textAlignVertical: "top",
    },
    dropdownTrigger: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
    },
    dropdownTriggerText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    dropdownMenu: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    dropdownList: {
      maxHeight: 220,
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemLast: {
      borderBottomWidth: 0,
    },
    dropdownItemActive: {
      backgroundColor: `${colors.primary}12`,
    },
    dropdownItemText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    dropdownItemTextActive: {
      color: colors.primary,
    },
    searchWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
    },
    teacherRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxChecked: {},
    teacherInfo: {
      flex: 1,
    },
    teacherTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    teacherMeta: {
      marginTop: 2,
      gap: 4,
    },
    teacherName: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
      flexShrink: 1,
    },
    teacherSubject: {
      fontSize: 12,
      color: `${colors.text}99`,
    },
    presenceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    presenceDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    presenceText: {
      fontSize: 11,
      fontWeight: "600",
      color: `${colors.text}99`,
    },
    emptyText: {
      textAlign: "center",
      fontSize: 12,
      color: `${colors.text}99`,
      paddingVertical: 16,
    },
    badgeWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.surface,
    },
    submitButton: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
      opacity: 0.7,
    },
    submitText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.surface,
    },
    cutoffNote: {
      marginTop: 8,
      fontSize: 11,
      color: `${colors.text}99`,
      textAlign: "center",
    },
    cutoffNoteLate: {
      color: `${colors.text}99`,
      fontStyle: "italic",
    },
    infoBox: {
      borderRadius: 14,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      backgroundColor: `${colors.primary}12`,
      paddingVertical: 12,
      paddingHorizontal: 12,
      gap: 6,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    infoText: {
      fontSize: 12,
      color: `${colors.text}99`,
    },
    historySection: {
      gap: 10,
    },
    historyTabs: {
      flexDirection: "row",
      gap: 8,
    },
    historyTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    historyTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    historyTabText: {
      fontSize: 12,
      fontWeight: "700",
      color: `${colors.text}99`,
    },
    historyTabTextActive: {
      color: colors.surface,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    historyEmpty: {
      fontSize: 12,
      color: `${colors.text}99`,
      textAlign: "center",
      paddingVertical: 12,
    },
    historyCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 6,
    },
    historyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    historySubject: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    historyStatus: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "capitalize",
    },
    historyMeta: {
      fontSize: 12,
      color: `${colors.text}99`,
    },
    historyMessage: {
      fontSize: 12,
      color: colors.text,
    },
    historyReply: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: 10,
      gap: 4,
    },
    historyReplyLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
    },
    historyReplyText: {
      fontSize: 12,
      color: colors.text,
    },
    historyLoadMore: {
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    historyLoadMoreText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    historyTime: {
      fontSize: 11,
      color: `${colors.text}99`,
    },
  });
};

export default DirectMessageScreen;
