import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  AnnouncementStudent,
  fetchAnnouncementStudents,
  sendTeacherAnnouncement,
} from "../api/teacher/announcements";
import { TeacherStudent } from "../types";

type Template = {
  id: string;
  title: string;
  message: string;
  category: "general" | "homework" | "event" | "urgent";
};

type Props = {
  gradeFilter: string;
  gradeOptions: { label: string; value: string }[];
  onGradeChange: (grade: string) => void;
  students: TeacherStudent[];
};

const ANNOUNCEMENT_TEMPLATES: Template[] = [
  {
    id: "t1",
    title: "Homework Reminder",
    message:
      "Reminder: Please ensure your child completes their homework by tomorrow. Thank you for your support.",
    category: "homework",
  },
  {
    id: "t2",
    title: "Class Performance Update",
    message:
      "Your child is doing well in class. Keep up the good work! We appreciate your continued support.",
    category: "general",
  },
  {
    id: "t3",
    title: "Upcoming Exam Notification",
    message:
      "There will be a test next week. Please help your child prepare by reviewing the materials shared in class.",
    category: "homework",
  },
  {
    id: "t4",
    title: "Parent-Teacher Meeting",
    message:
      "We invite you to attend our parent-teacher meeting on [Date] at [Time]. Looking forward to seeing you.",
    category: "event",
  },
  {
    id: "t5",
    title: "Early Dismissal",
    message:
      "School will dismiss early today at [Time] due to [Reason]. Please arrange pickup accordingly.",
    category: "urgent",
  },
  {
    id: "t6",
    title: "Positive Behavior Note",
    message: "Your child showed excellent behavior and leadership today. We're proud of their progress!",
    category: "general",
  },
  {
    id: "t7",
    title: "Missing Assignment",
    message:
      "Your child has a missing assignment. Please help them complete and submit it by [Date].",
    category: "homework",
  },
  {
    id: "t8",
    title: "Field Trip Permission",
    message:
      "We have an upcoming field trip to [Location] on [Date]. Please sign and return the permission slip.",
    category: "event",
  },
];

const AnnouncementsScreen = ({
  gradeFilter,
  gradeOptions,
  onGradeChange,
  students: teacherStudents,
}: Props) => {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [recipients, setRecipients] = useState<"section" | "individual">("section");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [students, setStudents] = useState<AnnouncementStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isGradeMenuOpen, setIsGradeMenuOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);

  const normalizedGradeFilter = gradeFilter === "all" ? "all" : gradeFilter;
  const menuOptions =
    gradeOptions.length > 0
      ? gradeOptions
      : [
        ];
  const studentSectionMap = useMemo(() => {
    const map = new Map<string, string>();
    teacherStudents.forEach((student) => {
      map.set(student.id, student.assignedSection.trim());
    });
    return map;
  }, [teacherStudents]);

  useEffect(() => {
    let isActive = true;

    const loadStudents = async () => {
      setStudentsLoading(true);
      setStudentsError(null);
      try {
        const fetchedStudents = await fetchAnnouncementStudents();
        if (isActive) {
          setStudents(fetchedStudents);
        }
      } catch (error) {
        if (isActive) {
          const message = error instanceof Error ? error.message : "Unable to load students.";
          setStudentsError(message);
          setStudents([]);
        }
      } finally {
        if (isActive) {
          setStudentsLoading(false);
        }
      }
    };

    loadStudents();
    return () => {
      isActive = false;
    };
  }, []);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setCustomMessage(template.message);
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const selectedStudentIdsForSend = useMemo(
    () =>
      selectedStudents
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    [selectedStudents]
  );

  const sectionStudentIdsForSend = useMemo(() => {
    const ids = students
      .filter((student) => {
        if (normalizedGradeFilter === "all") {
          return false;
        }
        const assignedSection = studentSectionMap.get(student.id) || "";
        return assignedSection === normalizedGradeFilter;
      })
      .map((student) => Number(student.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    return ids;
  }, [students, normalizedGradeFilter, studentSectionMap]);

  const sectionRecipientLabel =
    normalizedGradeFilter === "all" ? "selected section" : normalizedGradeFilter;

  const isSendDisabled =
    !customMessage ||
    isSending ||
    (recipients === "individual" && selectedStudentIdsForSend.length === 0) ||
    (recipients === "section" &&
      (normalizedGradeFilter === "all" || sectionStudentIdsForSend.length === 0));

  const handleSend = async () => {
    if (!customMessage) {
      return;
    }
    if (recipients === "section" && normalizedGradeFilter === "all") {
      setSendError("Select a section.");
      return;
    }
    if (recipients === "section" && sectionStudentIdsForSend.length === 0) {
      setSendError("No students found for the selected section.");
      return;
    }
    if (recipients === "individual" && selectedStudentIdsForSend.length === 0) {
      setSendError("Select at least one student.");
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      await sendTeacherAnnouncement({
        message: customMessage,
        recipients: "individual",
        student_ids:
          recipients === "section" ? sectionStudentIdsForSend : selectedStudentIdsForSend,
        subject: selectedTemplate?.title,
      });
      setSentSuccess(true);
      setIsSuccessVisible(true);
      setTimeout(() => {
        setSentSuccess(false);
        setIsSuccessVisible(false);
        setCustomMessage("");
        setSelectedTemplate(null);
        setSelectedStudents([]);
      }, 2500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send announcement.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return students.filter((student) => {
      const matchesSearch = student.name.toLowerCase().includes(query);
      if (!matchesSearch) {
        return false;
      }

      if (normalizedGradeFilter === "all") {
        return true;
      }

      const assignedSection = studentSectionMap.get(student.id) || "";
      return (
        assignedSection === normalizedGradeFilter
      );
    });
  }, [searchQuery, students, gradeFilter, normalizedGradeFilter, studentSectionMap]);

  const getCategoryStyle = (category: Template["category"]) => {
    switch (category) {
      case "homework":
        return styles.tagHomework;
      case "event":
        return styles.tagEvent;
      case "urgent":
        return styles.tagUrgent;
      default:
        return styles.tagGeneral;
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Message Template</Text>
      <View style={styles.templateDropdown}>
        <Pressable
          style={styles.templateSelectButton}
          onPress={() => setIsTemplateMenuOpen((prev) => !prev)}
        >
          <Text style={styles.templateSelectText}>
            {selectedTemplate ? selectedTemplate.title : "Choose a template"}
          </Text>
          <Ionicons
            name={isTemplateMenuOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color="#6B7D8F"
          />
        </Pressable>
        {isTemplateMenuOpen ? (
          <View style={styles.templateMenu}>
            <Pressable
              style={styles.templateMenuItem}
              onPress={() => {
                setSelectedTemplate(null);
                setIsTemplateMenuOpen(false);
              }}
            >
              <Text style={styles.templateMenuText}>Custom message</Text>
            </Pressable>
            {ANNOUNCEMENT_TEMPLATES.map((template) => {
              const isActive = selectedTemplate?.id === template.id;
              return (
                <Pressable
                  key={template.id}
                  onPress={() => {
                    handleTemplateSelect(template);
                    setIsTemplateMenuOpen(false);
                  }}
                  style={[styles.templateMenuItem, isActive && styles.templateMenuItemActive]}
                >
                  <View style={styles.templateMenuRow}>
                    <Text style={styles.templateMenuText}>{template.title}</Text>
                    <View style={[styles.templateTag, getCategoryStyle(template.category)]}>
                      <Text style={styles.templateTagText}>{template.category.toUpperCase()}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {selectedTemplate ? (
          <Text style={styles.templatePreview} numberOfLines={2}>
            {selectedTemplate.message}
          </Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Message Preview & Send</Text>
      <View style={styles.messagePanel}>
        <Text style={styles.inputLabel}>Recipients</Text>
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setRecipients("section")}
            style={[styles.toggleButton, recipients === "section" && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, recipients === "section" && styles.toggleTextActive]}>
              By Section
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setRecipients("individual")}
            style={[styles.toggleButton, recipients === "individual" && styles.toggleButtonActive]}
          >
            <Text
              style={[styles.toggleText, recipients === "individual" && styles.toggleTextActive]}
            >
              Individual
            </Text>
          </Pressable>
        </View>

        {recipients === "section" ? (
          <View style={styles.sectionBlock}>
            <Text style={styles.inputLabel}>Select Section</Text>
            <Pressable
              style={styles.gradeSelectButton}
              onPress={() => setIsGradeMenuOpen((prev) => !prev)}
            >
              <Text style={styles.gradeSelectText}>
                {normalizedGradeFilter === "all" ? "Select Section" : gradeFilter}
              </Text>
              <Ionicons
                name={isGradeMenuOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#6B7D8F"
              />
            </Pressable>
            {isGradeMenuOpen ? (
              <View style={styles.gradeMenu}>
                {menuOptions.map((option) => {
                  const isActive = gradeFilter === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.gradeMenuItem, isActive && styles.gradeMenuItemActive]}
                      onPress={() => {
                        onGradeChange(option.value);
                        setIsGradeMenuOpen(false);
                      }}
                    >
                      <Text style={[styles.gradeMenuText, isActive && styles.gradeMenuTextActive]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <Text style={styles.selectionHint}>
              {sectionStudentIdsForSend.length} student
              {sectionStudentIdsForSend.length === 1 ? "" : "s"} in section
            </Text>
          </View>
        ) : null}

        {recipients === "individual" ? (
          <View style={styles.individualBlock}>
            <View style={styles.filterRow}>
              <View style={styles.filterColumn}>
                <Text style={styles.inputLabel}>Select Students</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search students..."
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.filterColumn}>
                <Text style={styles.inputLabel}>Select Grade</Text>
                <Pressable
                  style={styles.gradeSelectButton}
                  onPress={() => setIsGradeMenuOpen((prev) => !prev)}
                >
                <Text style={styles.gradeSelectText}>
                  {gradeFilter === "all" ? "All Grades" : gradeFilter}
                </Text>
                  <Ionicons
                    name={isGradeMenuOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B7D8F"
                  />
                </Pressable>
                {isGradeMenuOpen ? (
                  <View style={styles.gradeMenu}>
                    {menuOptions.map((option) => {
                      const isActive = gradeFilter === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.gradeMenuItem,
                            isActive && styles.gradeMenuItemActive,
                          ]}
                          onPress={() => {
                            onGradeChange(option.value);
                            setIsGradeMenuOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.gradeMenuText,
                              isActive && styles.gradeMenuTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.studentPicker}>
              {studentsLoading ? (
                <Text style={styles.studentStatus}>Loading students...</Text>
              ) : studentsError ? (
                <Text style={styles.studentStatusError}>{studentsError}</Text>
              ) : filteredStudents.length === 0 ? (
                <Text style={styles.studentStatus}>No students found.</Text>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudents.includes(student.id);
                  return (
                    <Pressable
                      key={student.id}
                      onPress={() => handleStudentToggle(student.id)}
                      style={styles.studentOption}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                        {isSelected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                      </View>
                      <View style={styles.studentOptionMeta}>
                        <Text style={styles.studentOptionName} numberOfLines={1}>
                          {student.name}
                        </Text>
                        <Text style={styles.studentOptionParent} numberOfLines={1}>
                          Parent: {student.parentName || "N/A"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
            <Text style={styles.selectionHint}>
              {selectedStudentIdsForSend.length} student
              {selectedStudentIdsForSend.length === 1 ? "" : "s"} selected
            </Text>
          </View>
        ) : null}

        <Text style={styles.inputLabel}>Message</Text>
        <TextInput
          value={customMessage}
          onChangeText={setCustomMessage}
          placeholder="Type a custom message or select a template..."
          placeholderTextColor="#94A3B8"
          style={styles.messageInput}
          multiline
        />

        {sendError ? <Text style={styles.sendErrorText}>{sendError}</Text> : null}

        <View style={styles.sendRow}>
          <Pressable
            onPress={handleSend}
            disabled={isSendDisabled}
            style={[
              styles.sendButton,
              isSendDisabled && styles.sendButtonDisabled,
            ]}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? "Sending..." : sentSuccess ? "Sent Successfully!" : "Send Announcement"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCustomMessage("");
              setSelectedTemplate(null);
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {sentSuccess ? (
        <View style={styles.successBanner}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.successMeta}>
            <Text style={styles.successTitle}>Announcement Sent</Text>
            <Text style={styles.successBody}>
              Your message has been sent to{" "}
              {recipients === "section"
                ? `parents in ${sectionRecipientLabel}`
                : "selected parents"}
              .
            </Text>
          </View>
        </View>
      ) : null}
      <Modal transparent visible={isSuccessVisible} animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsSuccessVisible(false)}
        >
          <Pressable
            style={styles.modalCard}
            onPress={() => setIsSuccessVisible(false)}
          >
            <View style={styles.modalIconWrap}>
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Announcement Sent</Text>
            <Text style={styles.modalMessage}>
              Your message was sent to{" "}
              {recipients === "section"
                ? `parents in ${sectionRecipientLabel}`
                : "selected parents"}
              .
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setIsSuccessVisible(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 12,
    marginTop: 6,
  },
  templateList: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
    marginBottom: 20,
  },
  templateDropdown: {
    marginBottom: 20,
    position: "relative",
  },
  templateSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  templateSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F6CAB",
  },
  templateMenu: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    zIndex: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  templateMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  templateMenuItemActive: {
    backgroundColor: "#F0F7FB",
  },
  templateMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  templateMenuText: {
    fontSize: 12,
    color: "#6B7D8F",
    fontWeight: "600",
    flex: 1,
  },
  templatePreview: {
    fontSize: 12,
    color: "#6B7D8F",
    marginTop: 8,
  },
  templateCard: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  templateCardActive: {
    borderColor: "#2C77BC",
    backgroundColor: "#F4F9FF",
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2B3C",
    flex: 1,
    marginRight: 8,
  },
  templateTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  templateTagText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tagHomework: {
    backgroundColor: "#3B82F6",
  },
  tagEvent: {
    backgroundColor: "#8B5CF6",
  },
  tagUrgent: {
    backgroundColor: "#DC2626",
  },
  tagGeneral: {
    backgroundColor: "#6B7280",
  },
  templateMessage: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  messagePanel: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F3F6F9",
    padding: 6,
    borderRadius: 14,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3EAF1",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#2C77BC",
    borderColor: "#2C77BC",
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7D8F",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  individualBlock: {
    marginBottom: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  filterColumn: {
    flex: 1,
    minWidth: 150,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  gradeSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  gradeSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F6CAB",
  },
  gradeMenu: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    marginTop: 8,
  },
  gradeMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gradeMenuItemActive: {
    backgroundColor: "#F0F7FB",
  },
  gradeMenuText: {
    fontSize: 12,
    color: "#6B7D8F",
    fontWeight: "600",
  },
  gradeMenuTextActive: {
    color: "#0E63BB",
  },
  studentPicker: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    padding: 8,
    gap: 6,
    backgroundColor: "#FFFFFF",
  },
  studentStatus: {
    fontSize: 12,
    color: "#6B7D8F",
    paddingVertical: 6,
    textAlign: "center",
  },
  studentStatusError: {
    fontSize: 12,
    color: "#DC2626",
    paddingVertical: 6,
    textAlign: "center",
  },
  studentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F7FAFD",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#DCE7F2",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxActive: {
    backgroundColor: "#2C77BC",
    borderColor: "#2C77BC",
  },
  studentOptionMeta: {
    flex: 1,
  },
  studentOptionName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  studentOptionParent: {
    fontSize: 11,
    color: "#6B7D8F",
  },
  selectionHint: {
    fontSize: 11,
    color: "#6B7D8F",
    marginTop: 6,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#E7EDF3",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 140,
    textAlignVertical: "top",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  sendRow: {
    flexDirection: "row",
    gap: 10,
  },
  sendErrorText: {
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 10,
  },
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2C77BC",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DC",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EDF3",
  },
  clearButtonText: {
    fontSize: 13,
    color: "#6B7D8F",
    fontWeight: "600",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#22C55E",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    backgroundColor: "#F0FDF4",
    gap: 10,
  },
  successIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#22C55E",
  },
  successMeta: {
    flex: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22C55E",
    marginBottom: 4,
  },
  successBody: {
    fontSize: 12,
    color: "#6B7D8F",
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
});

export default AnnouncementsScreen;
