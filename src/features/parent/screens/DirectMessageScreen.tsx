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
  const HISTORY_PAGE_SIZE = 3;
  const initialFormData = {
    dateFrom: "",
    dateTo: "",
    concern: "General Question",
    reason: "Medical",
    customReason: "",
    message: "",
  };
  const [formData, setFormData] = useState({
    dateFrom: "",
    dateTo: "",
    concern: "General Question",
    reason: "Medical",
    customReason: "",
    message: "",
  });
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
  const [teachersByChildId, setTeachersByChildId] = useState<
    Record<string, Teacher[]>
  >({});
  const [isTeachersLoading, setIsTeachersLoading] = useState(false);
  const prefillSelectionRef = useRef<{ teacherIds: string[] } | null>(null);
  const prefillKeyRef = useRef<string | null>(null);
  const [historyItems, setHistoryItems] = useState<MessageHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryLoadingMore, setIsHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyTab, setHistoryTab] = useState<"all" | "message" | "excuse_letter">(
    "all"
  );
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

  const formatDate = (value: Date | null) =>
    value ? value.toISOString().slice(0, 10) : "";

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
    if (childOptions.length > 0) {
      return childOptions;
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
      const child = childOptionsForSelection.find(
        (option) => option.id === selectedChildIds[0]
      );
      return child?.label ?? "Selected Child";
    }
    if (selectedChildIds.length > 1) {
      return `${selectedChildIds.length} Children Selected`;
    }
    return "Select Students";
  }, [childOptionsForSelection, selectedChildIds]);

  const allChildIds = useMemo(
    () =>
      childOptionsForSelection.map((option) => option.id).filter((id) => id !== "all"),
    [childOptionsForSelection]
  );

  useEffect(() => {
    setHasManualSelection(false);
  }, [selectedChildId]);

  useEffect(() => {
    if (formData.concern !== "Excuse Letter") {
      setIsReasonMenuOpen(false);
    }
    setFormData((prev) => {
      let next = prev;
      if (prev.concern !== "Excuse Letter" && prev.reason !== "Medical") {
        next = { ...next, reason: "Medical" };
      }
      if (prev.concern !== "Other" && prev.reason !== "Other" && prev.customReason) {
        next = { ...next, customReason: "" };
      }
      return next;
    });
  }, [formData.concern]);

  useEffect(() => {
    if (hasManualSelection) {
      return;
    }
    if (selectedChildIds.length > 0) {
      return;
    }
    if (selectedChildId === "all" && allChildIds.length > 0) {
      setSelectedChildIds(["all", ...allChildIds]);
      return;
    }
    if (selectedChildId !== "all") {
      setSelectedChildIds([selectedChildId]);
    }
  }, [allChildIds, hasManualSelection, selectedChildId, selectedChildIds.length]);

  useEffect(() => {
    const childIds = initialSelectedChildIds ?? [];
    const teacherIds = initialSelectedTeacherIds ?? [];
    if (childIds.length === 0 && teacherIds.length === 0) {
      return;
    }
    const nextKey = `${childIds.join(",")}::${teacherIds.join(",")}`;
    if (prefillKeyRef.current === nextKey) {
      return;
    }
    prefillKeyRef.current = nextKey;
    if (childIds.length > 0) {
      prefillSelectionRef.current = { teacherIds };
      setSelectedChildIds(childIds);
      setHasManualSelection(true);
    }
    if (teacherIds.length > 0 && childIds.length === 0) {
      setSelectedTeachers(teacherIds);
      prefillKeyRef.current = null;
    }
    if (onPrefillApplied) {
      onPrefillApplied();
    }
  }, [initialSelectedChildIds, initialSelectedTeacherIds, onPrefillApplied]);

  useEffect(() => {
    const selectedIds = selectedChildIds.length
      ? selectedChildIds
      : selectedChildId !== "all"
      ? [selectedChildId]
      : [];
    const actualChildIds = selectedIds.includes("all")
      ? childOptionsForSelection
          .map((option) => option.id)
          .filter((id) => id !== "all")
      : selectedIds;

    if (actualChildIds.length === 0) {
      setTeachers([]);
      setSelectedTeachers([]);
      return;
    }

    let isActive = true;
  const loadTeachers = async () => {
      const hasPrefillTeachers = Boolean(prefillSelectionRef.current?.teacherIds.length);
      if (!hasPrefillTeachers) {
        setSelectedTeachers([]);
      }
      setIsTeachersLoading(true);
      try {
        const results = await Promise.all(
          actualChildIds.map((childId) => fetchStudentTeachers(childId))
        );
        if (!isActive) {
          return;
        }
        const merged = new Map<string, Teacher>();
        const byChild: Record<string, Teacher[]> = {};
        results.forEach((response, index) => {
          const childId = actualChildIds[index];
          const normalizedTeachers = response.teachers.map((teacher) => {
            const normalizedId = String(teacher.id);
            const presenceId = String(
              (teacher as { user_id?: string | number }).user_id ??
                (teacher as { userId?: string | number }).userId ??
                teacher.id
            );
            return { ...teacher, id: normalizedId, presenceId };
          });
          byChild[childId] = normalizedTeachers;
          normalizedTeachers.forEach((teacher) => {
            merged.set(teacher.id, teacher);
          });
        });
        setTeachers(Array.from(merged.values()));
        setTeachersByChildId(byChild);
        if (prefillSelectionRef.current?.teacherIds.length) {
          const allowedIds = new Set(Array.from(merged.keys()));
          const filteredPrefill = prefillSelectionRef.current.teacherIds.filter((id) =>
            allowedIds.has(id)
          );
          prefillSelectionRef.current = null;
          prefillKeyRef.current = null;
          setSelectedTeachers(filteredPrefill);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }
        setTeachers([]);
        setTeachersByChildId({});
      } finally {
        if (isActive) {
          setIsTeachersLoading(false);
        }
      }
    };

    loadTeachers();
    return () => {
      isActive = false;
    };
  }, [childOptionsForSelection, selectedChildId, selectedChildIds]);

  useEffect(() => {
    if (!feedback.visible || feedback.variant !== "success") {
      return;
    }

    const timer = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }));
    }, 8000);

    return () => clearTimeout(timer);
  }, [feedback.visible, feedback.variant]);

  useEffect(() => {
    const updateCutoff = () => {
      setIsAfterCutoff(isAfterMessagingCutoff());
    };
    updateCutoff();
    const timer = setInterval(updateCutoff, 60000);
    return () => clearInterval(timer);
  }, []);

  const mapHistoryItems = (letters: ParentMessageHistoryItem[]) =>
    letters.map((item) => {
      const reason =
        item.reason === "Other" && item.custom_reason ? item.custom_reason : item.reason;
      return {
        id: String(item.id),
        childName: item.child_name || "Student",
        type: item.type ?? "excuse_letter",
        dateFrom: item.date_from,
        dateTo: item.date_to,
        reason,
        message: item.message,
        teacherResponse: item.teacher_response ?? null,
        status: item.status,
        submittedAt: item.submitted_at,
        teacherNames: item.teacher_names ?? [],
      } as MessageHistoryItem;
    });

  const mergeHistory = (
    current: MessageHistoryItem[],
    incoming: MessageHistoryItem[]
  ) => {
    const seen = new Set(current.map((item) => item.id));
    const next = incoming.filter((item) => !seen.has(item.id));
    return [...current, ...next];
  };

  const loadHistory = async (page: number, replace: boolean) => {
    if (replace) {
      setIsHistoryLoading(true);
    } else {
      setIsHistoryLoadingMore(true);
    }
    setHistoryError(null);
    try {
      const response = await fetchParentMessageHistory({
        childId: selectedChildId,
        page,
        perPage: HISTORY_PAGE_SIZE,
      });
      const mapped = mapHistoryItems(response.letters);
      setHistoryItems((prev) => (replace ? mapped : mergeHistory(prev, mapped)));
      const totalPages = response.pagination?.total_pages ?? page;
      setHistoryHasMore(page < totalPages);
      setHistoryPage(page);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load history.";
      setHistoryError(message);
      if (replace) {
        setHistoryItems([]);
      }
    } finally {
      if (replace) {
        setIsHistoryLoading(false);
      } else {
        setIsHistoryLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setHistoryPage(1);
    setHistoryHasMore(true);
    loadHistory(1, true);
  }, [selectedChildId]);

  const filteredHistoryItems = useMemo(() => {
    if (historyTab === "all") {
      return historyItems;
    }
    return historyItems.filter((item) => item.type === historyTab);
  }, [historyItems, historyTab]);

  const toggleChildSelection = (childId: string) => {
    setHasManualSelection(true);
    if (childId === "all") {
      setSelectedChildIds((prev) =>
        prev.includes("all") ? [] : ["all", ...allChildIds]
      );
      return;
    }

    setSelectedChildIds((prev) => {
      const withoutAll = prev.filter((id) => id !== "all");
      if (withoutAll.includes(childId)) {
        const next = withoutAll.filter((id) => id !== childId);
        return next;
      }
      const next = [...withoutAll, childId];
      if (allChildIds.length > 0 && allChildIds.every((id) => next.includes(id))) {
        return ["all", ...allChildIds];
      }
      return next;
    });
  };

  const handleDateChange =
    (field: "dateFrom" | "dateTo") =>
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === "android") {
        if (field === "dateFrom") {
          setShowDateFromPicker(false);
        } else {
          setShowDateToPicker(false);
        }
      }
      if (event.type === "dismissed") {
        return;
      }
      if (!selectedDate) {
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const normalizedSelected = new Date(selectedDate);
      normalizedSelected.setHours(0, 0, 0, 0);
      if (field === "dateFrom" && normalizedSelected < today) {
        Alert.alert("Invalid date", "Date From cannot be earlier than today.");
        return;
      }
      if (field === "dateTo") {
        const fromValue = dateFromValue ? new Date(dateFromValue) : null;
        if (fromValue) {
          fromValue.setHours(0, 0, 0, 0);
          if (normalizedSelected < fromValue) {
            Alert.alert("Invalid date", "Date To cannot be earlier than Date From.");
            return;
          }
        }
      }
      const formatted = formatDate(selectedDate);
      setFormData((prev) => ({ ...prev, [field]: formatted }));
      if (field === "dateFrom") {
        setDateFromValue(selectedDate);
        if (dateToValue && selectedDate > dateToValue) {
          setDateToValue(selectedDate);
          setFormData((prev) => ({ ...prev, dateTo: formatted }));
        }
      } else {
        setDateToValue(selectedDate);
      }
    };

  const filteredTeachers = useMemo(() => {
    const search = teacherSearch.trim().toLowerCase();
    if (!search) {
      return teachers;
    }
    return teachers.filter(
      (teacher) =>
        teacher.name.toLowerCase().includes(search) ||
        teacher.subject.toLowerCase().includes(search)
    );
  }, [teacherSearch, teachers]);

  const allTeacherIds = useMemo(() => teachers.map((teacher) => teacher.id), [teachers]);
  const hasAllTeachersSelected = useMemo(() => {
    if (allTeacherIds.length === 0) {
      return false;
    }
    const selectedSet = new Set(selectedTeachers);
    return allTeacherIds.every((id) => selectedSet.has(id));
  }, [allTeacherIds, selectedTeachers]);

  const teacherSelectionLabel = useMemo(() => {
    if (selectedTeachers.length === 0) {
      return "Select teachers";
    }
    if (hasAllTeachersSelected) {
      return "All teachers";
    }
    const names = selectedTeachers
      .map((id) => teachers.find((item) => item.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      return `${selectedTeachers.length} selected`;
    }
    if (names.length <= 2) {
      return names.join(", ");
    }
    return `${names[0]}, ${names[1]} +${names.length - 2}`;
  }, [selectedTeachers, teachers]);

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const toggleAllTeachers = () => {
    if (hasAllTeachersSelected) {
      setSelectedTeachers([]);
      return;
    }
    setSelectedTeachers(allTeacherIds);
  };

  const getPresence = (teacherId: string) => {
    const presence = teacherPresence[teacherId];
    const status = presence?.status ?? "Offline";
    if (status === "Available") {
      return { label: "Available", color: "#16A34A" };
    }
    if (status === "Busy") {
      return { label: "Busy", color: "#F59E0B" };
    }
    return { label: "Offline", color: "#64748B" };
  };

  const handleSubmit = async () => {
    const selectedIds = selectedChildIds.length
      ? selectedChildIds
      : selectedChildId !== "all"
      ? [selectedChildId]
      : [];
    const actualChildIds = selectedIds.includes("all")
      ? childOptionsForSelection
          .map((option) => option.id)
          .filter((id) => id !== "all")
      : selectedIds;

    if (actualChildIds.length === 0) {
      Alert.alert("Select students", "Please choose at least one student.");
      return;
    }
    const needsDates = formData.concern === "Excuse Letter";
    if ((!formData.dateFrom || !formData.dateTo) && needsDates) {
      Alert.alert("Missing details", "Please select the date range.");
      return;
    }
    if (!formData.message) {
      Alert.alert("Missing details", "Please complete the required fields.");
      return;
    }
    if (needsDates && dateFromValue && dateToValue && dateToValue < dateFromValue) {
      Alert.alert("Invalid dates", "Date To must be the same or after Date From.");
      return;
    }
    if (
      (formData.concern === "Other" || formData.reason === "Other") &&
      !formData.customReason.trim()
    ) {
      Alert.alert("Missing details", "Please specify the concern or reason.");
      return;
    }
    if (selectedTeachers.length === 0) {
      Alert.alert("Select teachers", "Please select at least one teacher.");
      return;
    }
    if (isSubmitting) {
      return;
    }

    const resolvedConcern =
      formData.concern === "Other" ? formData.customReason.trim() : formData.concern;
    const resolvedReason =
      formData.reason === "Other" ? formData.customReason.trim() : formData.reason;
    const teacherIds = Array.from(
      new Set(
        selectedTeachers
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0)
          .map((id) => String(id))
      )
    );
    if (teacherIds.length === 0) {
      Alert.alert("Select teachers", "Please select at least one teacher.");
      return;
    }

    setIsSubmitting(true);
    try {
      let successCount = 0;
      const failures: string[] = [];

      for (const childId of actualChildIds) {
        const childTeacherIds = new Set(
          (teachersByChildId[childId] ?? []).map((teacher) => teacher.id)
        );
        const filteredTeacherIds = teacherIds.filter((id) =>
          childTeacherIds.has(id)
        );
        if (filteredTeacherIds.length === 0) {
          failures.push("Please select a teacher for each student.");
          continue;
        }
        const payload = {
          childId,
          teacherIds: filteredTeacherIds,
          dateFrom: needsDates ? formData.dateFrom : "",
          dateTo: needsDates ? formData.dateTo : "",
          reason: resolvedConcern === "Excuse Letter" ? resolvedReason : resolvedConcern,
          customReason:
            formData.concern === "Other" || formData.reason === "Other"
              ? formData.customReason.trim()
              : "",
          message: formData.message.trim(),
        };
        // console.log("[DirectMessage] submit payload", payload);
        const response = await submitExcuseLetter(payload);
        // console.log("[DirectMessage] submit response", response);
        if (!response.success) {
          failures.push(response.message || "Submission failed.");
        } else {
          successCount += 1;
        }
      }

      if (successCount > 0) {
        const dateNote = needsDates
          ? `from ${formData.dateFrom} to ${formData.dateTo}`
          : "";
        const summary =
          successCount === actualChildIds.length
            ? `${successCount} student${successCount === 1 ? "" : "s"} sent ${dateNote}`
            : `${successCount} student${successCount === 1 ? "" : "s"} sent ${dateNote}. You can send to the remaining students anytime.`;
        setFeedback({
          visible: true,
          title: "Message sent",
          message: "Your message is on its way.",
          details: summary.trim(),
          variant: "success",
        });
        resetForm();
        await loadHistory(1, true);
      }
    } catch (error) {
      setFeedback({
        visible: true,
        title: "Try again",
        message: "We are ready when you are.",
        details: "Please tap Send Message to retry.",
        variant: "info",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Send a Message</Text>
        <Text style={styles.subtitle}>For {childSelectionLabel}</Text>
        <Text style={styles.headerHint}>
          Choose a concern, then write your message. For an excuse letter, add the dates.
        </Text>
      </View>

      <Card>
        
        <View style={styles.section}>
          <Text style={styles.label}>Concern *</Text>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setIsConcernMenuOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownTriggerText}>{formData.concern}</Text>
            <Ionicons
              name={isConcernMenuOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#1A73E8"
            />
          </Pressable>
          {isConcernMenuOpen ? (
            <View style={styles.dropdownMenu}>
              {CONCERN_OPTIONS.map((concern, index) => {
                const isSelected = concern === formData.concern;
                const isLast = index === CONCERN_OPTIONS.length - 1;
                return (
                  <Pressable
                    key={concern}
                    onPress={() => {
                      setFormData((prev) => ({ ...prev, concern }));
                      setIsConcernMenuOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      isLast && styles.dropdownItemLast,
                      isSelected && styles.dropdownItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextActive,
                      ]}
                    >
                      {concern}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select Students *</Text>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setIsStudentMenuOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownTriggerText}>{childSelectionLabel}</Text>
            <Ionicons
              name={isStudentMenuOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#1A73E8"
            />
          </Pressable>
          {isStudentMenuOpen ? (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {childOptionsForSelection.map((child) => {
                  const isSelected = selectedChildIds.includes(child.id);
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => toggleChildSelection(child.id)}
                      style={styles.teacherRow}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <View style={styles.teacherInfo}>
                        <Text style={styles.teacherName}>{child.label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {formData.concern === "Excuse Letter" ? (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Date From *</Text>
              <Pressable onPress={() => setShowDateFromPicker(true)}>
                <TextInput
                  value={formData.dateFrom}
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {showDateFromPicker ? (
                <DateTimePicker
                  value={dateFromValue ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleDateChange("dateFrom")}
                  minimumDate={today}
                />
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Date To *</Text>
              <Pressable onPress={() => setShowDateToPicker(true)}>
                <TextInput
                  value={formData.dateTo}
                  placeholder="YYYY-MM-DD"
                  style={styles.input}
                  editable={false}
                  pointerEvents="none"
                />
              </Pressable>
              {showDateToPicker ? (
                <DateTimePicker
                  value={dateToValue ?? dateFromValue ?? new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "calendar"}
                  onChange={handleDateChange("dateTo")}
                  minimumDate={dateFromValue ?? today}
                />
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Reason for Absence *</Text>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => setIsReasonMenuOpen((prev) => !prev)}
              >
                <Text style={styles.dropdownTriggerText}>{formData.reason}</Text>
                <Ionicons
                  name={isReasonMenuOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#1A73E8"
                />
              </Pressable>
              {isReasonMenuOpen ? (
                <View style={styles.dropdownMenu}>
                  {EXCUSE_REASON_OPTIONS.map((reason, index) => {
                    const isSelected = reason === formData.reason;
                    const isLast = index === EXCUSE_REASON_OPTIONS.length - 1;
                    return (
                      <Pressable
                        key={reason}
                        onPress={() => {
                          setFormData((prev) => ({ ...prev, reason }));
                          setIsReasonMenuOpen(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          isLast && styles.dropdownItemLast,
                          isSelected && styles.dropdownItemActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            isSelected && styles.dropdownItemTextActive,
                          ]}
                        >
                          {reason}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {formData.concern === "Other" || formData.reason === "Other" ? (
          <View style={styles.section}>
            <Text style={styles.label}>Please Specify *</Text>
            <TextInput
              value={formData.customReason}
              onChangeText={(value) =>
                setFormData((prev) => ({ ...prev, customReason: value }))
              }
              placeholder="Enter specific concern..."
              style={styles.input}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>Select Teachers *</Text>
          <Pressable
            style={styles.dropdownTrigger}
            onPress={() => setIsTeacherMenuOpen((prev) => !prev)}
          >
            <Text style={styles.dropdownTriggerText}>{teacherSelectionLabel}</Text>
            <Ionicons
              name={isTeacherMenuOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#1A73E8"
            />
          </Pressable>
          {isTeacherMenuOpen ? (
            <View style={styles.dropdownMenu}>
              {/* <View style={styles.searchWrapper}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  value={teacherSearch}
                  onChangeText={setTeacherSearch}
                  placeholder="Search teachers..."
                  style={styles.searchInput}
                />
              </View> */}
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {isTeachersLoading ? (
                  <Text style={styles.emptyText}>Loading teachers...</Text>
                ) : filteredTeachers.length > 0 ? (
                  <>
                    <Pressable onPress={toggleAllTeachers} style={styles.teacherRow}>
                      <View
                        style={[
                          styles.checkbox,
                          hasAllTeachersSelected && styles.checkboxChecked,
                        ]}
                      >
                        {hasAllTeachersSelected ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>
                      <View style={styles.teacherInfo}>
                        <View style={styles.teacherTopRow}>
                          <Text style={styles.teacherName}>All teachers</Text>
                        </View>
                        <View style={styles.teacherMeta}>
                          <Text style={styles.teacherSubject}>
                            Message everyone in this list
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                    {filteredTeachers.map((teacher) => {
                      const isSelected = selectedTeachers.includes(teacher.id);
                      const presence = getPresence(teacher.presenceId ?? teacher.id);
                      return (
                        <Pressable
                          key={teacher.id}
                          onPress={() => toggleTeacher(teacher.id)}
                          style={styles.teacherRow}
                        >
                          <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                            {isSelected ? (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            ) : null}
                          </View>
                          <View style={styles.teacherInfo}>
                            <View style={styles.teacherTopRow}>
                              <Text style={styles.teacherName}>{teacher.name}</Text>
                              <View style={styles.presenceRow}>
                                <View
                                  style={[
                                    styles.presenceDot,
                                    { backgroundColor: presence.color },
                                  ]}
                                />
                                <Text style={styles.presenceText}>{presence.label}</Text>
                              </View>
                            </View>
                            <View style={styles.teacherMeta}>
                              <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </>
                ) : (
                  <Text style={styles.emptyText}>
                    {selectedChildIds.length === 0
                      ? "Please select a student first."
                      : "No teachers found."}
                  </Text>
                )}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Message *</Text>
          <TextInput
            value={formData.message}
            onChangeText={(value) => setFormData((prev) => ({ ...prev, message: value }))}
            placeholder="Write your message here."
            placeholderTextColor="#94A3B8"
            multiline
            style={[styles.input, styles.textArea]}
          />
        </View>

        <Pressable
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
          <Text style={styles.submitText}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Text>
        </Pressable>
        <Text
          style={[
            styles.cutoffNote,
            isAfterCutoff && styles.cutoffNoteLate,
          ]}
        >
          {isAfterCutoff
            ? "Response may be delayed as its already late in the evening."
            : "If you message after 7:00 PM (Philippine time), your teacher may reply tomorrow."}
        </Text>
      </Card>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Helpful Tips</Text>
        <Text style={styles.infoText}>
          - Use Excuse Letter to add dates and an absence reason.
        </Text>
        <Text style={styles.infoText}>
          - If you can, send excuse letters 24 hours ahead.
        </Text>
        <Text style={styles.infoText}>
          - Medical absences over 3 days may need a doctor's note.
        </Text>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>History</Text>
        <View style={styles.historyTabs}>
          <Pressable
            style={[
              styles.historyTab,
              historyTab === "all" && styles.historyTabActive,
            ]}
            onPress={() => setHistoryTab("all")}
          >
            <Text
              style={[
                styles.historyTabText,
                historyTab === "all" && styles.historyTabTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.historyTab,
              historyTab === "message" && styles.historyTabActive,
            ]}
            onPress={() => setHistoryTab("message")}
          >
            <Text
              style={[
                styles.historyTabText,
                historyTab === "message" && styles.historyTabTextActive,
              ]}
            >
              Messages
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.historyTab,
              historyTab === "excuse_letter" && styles.historyTabActive,
            ]}
            onPress={() => setHistoryTab("excuse_letter")}
          >
            <Text
              style={[
                styles.historyTabText,
                historyTab === "excuse_letter" && styles.historyTabTextActive,
              ]}
            >
              Excuse Letters
            </Text>
          </Pressable>
        </View>
        {isHistoryLoading ? (
          <Text style={styles.historyEmpty}>Loading history...</Text>
        ) : historyError ? (
          <Text style={styles.historyEmpty}>{historyError}</Text>
        ) : filteredHistoryItems.length === 0 ? (
          <Text style={styles.historyEmpty}>No messages sent yet.</Text>
        ) : (
          <>
            {filteredHistoryItems.map((item) => {
              const dateLabel =
                item.type === "excuse_letter" && item.dateFrom
                  ? item.dateTo && item.dateTo !== item.dateFrom
                    ? `${item.dateFrom} to ${item.dateTo}`
                    : item.dateFrom
                  : "Message";
              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historySubject}>
                      {item.type === "excuse_letter" ? "Excuse Letter" : "Message"}
                    </Text>
                    <Text style={styles.historyStatus}>{item.status}</Text>
                  </View>
                  <Text style={styles.historyMeta}>
                    {item.childName} - {dateLabel}
                  </Text>
                  {item.teacherNames.length > 0 ? (
                    <Text style={styles.historyMeta}>
                      To: {item.teacherNames.join(", ")}
                    </Text>
                  ) : null}
                  <Text style={styles.historyMessage}>{item.message}</Text>
                  {item.teacherResponse ? (
                    <View style={styles.historyReply}>
                      <Text style={styles.historyReplyLabel}>Teacher Reply</Text>
                      <Text style={styles.historyReplyText}>{item.teacherResponse}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.historyTime}>{item.submittedAt}</Text>
                </View>
              );
            })}
            {historyHasMore ? (
              <Pressable
                style={styles.historyLoadMore}
                onPress={() => loadHistory(historyPage + 1, false)}
                disabled={isHistoryLoadingMore}
              >
                <Text style={styles.historyLoadMoreText}>
                  {isHistoryLoadingMore ? "Loading..." : "Load More"}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      <Modal transparent visible={feedback.visible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
        >
          <Pressable
            style={styles.modalCard}
            onPress={() => setFeedback((prev) => ({ ...prev, visible: false }))}
          >
            <View
              style={[
                styles.modalIconWrap,
                feedback.variant === "success"
                  ? styles.modalIconSuccess
                  : styles.modalIconInfo,
              ]}
            >
              <Ionicons
                name={feedback.variant === "success" ? "checkmark" : "information"}
                size={22}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.modalTitle}>{feedback.title}</Text>
            <Text style={styles.modalMessage}>{feedback.message}</Text>
            {feedback.details ? (
              <Text style={styles.modalDetails}>{feedback.details}</Text>
            ) : null}
            <Pressable
              style={[
                styles.modalButton,
                feedback.variant === "success"
                  ? styles.modalButtonSuccess
                  : styles.modalButtonInfo,
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    gap: 14,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  headerHint: {
    fontSize: 12,
    color: "#64748B",
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
    shadowColor: "#0B1F35",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0E63BB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalIconSuccess: {
    backgroundColor: "#22C55E",
  },
  modalIconInfo: {
    backgroundColor: "#2563EB",
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
    marginBottom: 10,
  },
  modalDetails: {
    fontSize: 11,
    color: "#94A3B8",
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
    backgroundColor: "#0E63BB",
  },
  modalButtonInfo: {
    backgroundColor: "#2563EB",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: "#CBD5F5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  dropdownTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  dropdownMenu: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#E2E8F0",
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: "#E0F2FE",
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  dropdownItemTextActive: {
    color: "#1A73E8",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#3A8FB7",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3A8FB7",
  },
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
    color: "#0F172A",
    flexShrink: 1,
  },
  teacherSubject: {
    fontSize: 12,
    color: "#64748B",
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
    color: "#475569",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    paddingVertical: 16,
  },
  badgeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: "#3A8FB7",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  submitButton: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#3A8FB7",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cutoffNote: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
  },
  cutoffNoteLate: {
    color: "#64748B",
    fontStyle: "italic",
  },
  infoBox: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#3A8FB7",
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  infoText: {
    fontSize: 12,
    color: "#475569",
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
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  historyTabActive: {
    backgroundColor: "#0E63BB",
    borderColor: "#0E63BB",
  },
  historyTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  historyTabTextActive: {
    color: "#FFFFFF",
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  historyEmpty: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 12,
  },
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
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
    color: "#1A2B3C",
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3B82F6",
    textTransform: "capitalize",
  },
  historyMeta: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  historyMessage: {
    fontSize: 12,
    color: "#1E293B",
  },
  historyReply: {
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
    paddingLeft: 10,
    gap: 4,
  },
  historyReplyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  historyReplyText: {
    fontSize: 12,
    color: "#1E293B",
  },
  historyLoadMore: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  historyLoadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0E63BB",
  },
  historyTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
});

export default DirectMessageScreen;
