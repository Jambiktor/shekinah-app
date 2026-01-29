import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Card from "../components/Card";
import NotificationItem from "../components/NotificationItem";
import SkeletonBlock from "../components/SkeletonBlock";
import { formatReportDate } from "../../../shared/helpers/date";
import { LogEntry, Notification, ReportStats } from "../types";
import { fetchStudentTeachers } from "../api/parent/teachers";

type Teacher = {
  id: string;
  name: string;
  subject: string;
  cardImage?: string | null;
  presenceId?: string;
};

type Props = {
  stats: ReportStats;
  notifications: Notification[];
  logs: LogEntry[];
  activeEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  isLoading: boolean;
  onOpenDirectMessage: (childIds: string[], teacherIds: string[]) => void;
  selectedChildId: string | null;
  onSelectChild: (childId: string) => void;
  teacherPresence: Record<string, { status: string; timestamp: string }>;
};

const DashboardScreen = ({
  stats,
  notifications,
  logs,
  activeEmailId,
  onSelectEmail,
  isLoading,
  onOpenDirectMessage,
  selectedChildId,
  onSelectChild,
  teacherPresence,
}: Props) => {
  const [searchText, setSearchText] = useState("");
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
  const [attendanceDateIndex, setAttendanceDateIndex] = useState<number | null>(null);
  const [isTalkModalOpen, setIsTalkModalOpen] = useState(false);
  const [isLateNightModalOpen, setIsLateNightModalOpen] = useState(false);
  const [selectedTalkStudentIds, setSelectedTalkStudentIds] = useState<string[]>([]);
  const [talkTeachers, setTalkTeachers] = useState<Teacher[]>([]);
  const [isTalkTeachersLoading, setIsTalkTeachersLoading] = useState(false);
  const [isSnapshotSticky, setIsSnapshotSticky] = useState(false);
  const snapshotStickyY = useRef<number | null>(null);
  const activeChildId =
    selectedChildId && selectedChildId !== "all" ? selectedChildId : null;
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

  const resolvePresenceId = (teacher: {
    id: string;
    user_id?: string | number;
    userId?: string | number;
  }) => {
    const raw = teacher.user_id ?? teacher.userId ?? teacher.id;
    return String(raw);
  };

  useEffect(() => {
    if (stats.children.length === 0) {
      return;
    }

    const hasSelection = activeChildId
      ? stats.children.some((child) => child.id === activeChildId)
      : false;
    if (!hasSelection) {
      onSelectChild(stats.children[0].id);
    }
  }, [activeChildId, onSelectChild, stats.children]);

  const filteredChildren = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return stats.children;
    }

    return stats.children.filter((child) => {
      const phoneValue = child.phone?.toLowerCase() ?? "";
      return (
        child.fullName.toLowerCase().includes(query) ||
        phoneValue.includes(query) ||
        child.email.toLowerCase().includes(query) ||
        child.studentId.toLowerCase().includes(query) ||
        child.grade.toLowerCase().includes(query)
      );
    });
  }, [searchText, stats.children]);

  const selectedChild = useMemo(() => {
    if (!activeChildId) {
      return null;
    }
    return stats.children.find((child) => child.id === activeChildId) ?? null;
  }, [activeChildId, stats.children]);

  const handleSnapshotLayout = useCallback((event: LayoutChangeEvent) => {
    snapshotStickyY.current = event.nativeEvent.layout.y;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const stickyY = snapshotStickyY.current;
      if (stickyY === null) {
        return;
      }
      const offsetY = event.nativeEvent.contentOffset.y;
      const nextSticky = offsetY >= stickyY - 1;
      setIsSnapshotSticky((prev) => (prev === nextSticky ? prev : nextSticky));
    },
    []
  );


  const inboxItems = useMemo(() => {
    return [...notifications].sort((a, b) => {
      const aTime = new Date(a.datetimeSend).getTime();
      const bTime = new Date(b.datetimeSend).getTime();
      return bTime - aTime;
    }).slice(0, 7);
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((email) => email.readStatus === "unread").length,
    [notifications]
  );

  const totalEntries = stats.summary.totalChildren || stats.children.length;
  const showingCount = Math.min(filteredChildren.length, totalEntries);
  const snapshotItems = useMemo(() => {
    if (!selectedChild) {
      return [];
    }

    return [
      {
        id: "updates",
        label: "This month's updates",
        value: String(selectedChild.monthlyLogs),
      },
      {
        id: "attendance",
        label: "Days at school",
        value: String(selectedChild.presentDays),
      },
      {
        id: "latest",
        label: "Latest activity",
        value: formatReportDate(selectedChild.lastLogAt),
      },
    ];
  }, [selectedChild]);

  const formatAttendanceDate = (date: Date | null, fallback: string) => {
    if (!date) {
      return fallback;
    }
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return formatted.replace(/,/g, "");
  };

  const formatAttendanceTime = (date: Date | null, fallback: string) => {
    if (!date) {
      return fallback;
    }
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const makeLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setAttendanceDateIndex(null);
  }, [activeChildId]);

  useEffect(() => {
    if (selectedTalkStudentIds.length === 0) {
      setTalkTeachers([]);
      return;
    }

    let isActive = true;
    const loadTeachers = async () => {
      setIsTalkTeachersLoading(true);
      try {
        const results = await Promise.all(
          selectedTalkStudentIds.map((childId) => fetchStudentTeachers(childId))
        );
        if (!isActive) {
          return;
        }
        const merged = new Map<string, Teacher>();
        results.forEach((response, index) => {
          const childId = selectedTalkStudentIds[index];
          const normalizedTeachers = response.teachers.map((teacher) => {
            const normalizedId = String(teacher.id);
            const presenceId = resolvePresenceId(teacher as {
              id: string;
              user_id?: string | number;
              userId?: string | number;
            });
            const subjects =
              Array.isArray((teacher as { subjects?: Array<{ name?: string }> }).subjects)
                ? (teacher as { subjects?: Array<{ name?: string }> }).subjects ?? []
                : [];
            const subjectNames = subjects
              .map((subject) => subject?.name ?? "")
              .filter(Boolean)
              .join(", ");
            const fallbackSubject = (teacher as { subject?: string }).subject ?? "";
            const cardImage =
              (teacher as { card_image?: string | null }).card_image ??
              (teacher as { cardImage?: string | null }).cardImage ??
              (teacher as { user_meta?: { card_image?: string | null } }).user_meta
                ?.card_image ??
              null;
            return {
              ...teacher,
              id: normalizedId,
              presenceId,
              subject: subjectNames || fallbackSubject,
              cardImage,
            };
          });
          normalizedTeachers.forEach((teacher) => {
            merged.set(teacher.id, teacher);
          });
        });
        setTalkTeachers(Array.from(merged.values()));
      } catch (error) {
        if (!isActive) {
          return;
        }
        setTalkTeachers([]);
      } finally {
        if (isActive) {
          setIsTalkTeachersLoading(false);
        }
      }
    };

    loadTeachers();
    return () => {
      isActive = false;
    };
  }, [selectedTalkStudentIds]);

  const selectedChildLogs = useMemo(() => {
    if (!activeChildId) {
      return [];
    }
    return logs.filter((log) => log.childId === activeChildId);
  }, [activeChildId, logs]);

  const resetTalkModal = () => {
    setSelectedTalkStudentIds([]);
    setTalkTeachers([]);
  };

  const isLateNight = () => {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6;
  };

  const handleOpenTalkModal = () => {
    const openModal = () => {
      resetTalkModal();
      if (activeChildId) {
        setSelectedTalkStudentIds([activeChildId]);
      }
      setIsTalkModalOpen(true);
    };

    if (isLateNight()) {
      setIsLateNightModalOpen(true);
      return;
    }

    openModal();
  };

  const handleTalkTeacherSelect = (teacherId: string) => {
    if (!activeChildId) {
      Alert.alert("Select student", "Please select a student first.");
      return;
    }
    onOpenDirectMessage([activeChildId], [teacherId]);
    setIsTalkModalOpen(false);
    resetTalkModal();
  };

  const handleTalkTeacherSelectAll = () => {
    if (!activeChildId) {
      Alert.alert("Select student", "Please select a student first.");
      return;
    }
    const teacherIds = talkTeachers.map((teacher) => teacher.id);
    if (teacherIds.length === 0) {
      Alert.alert("Select teachers", "No teachers available for this student.");
      return;
    }
    onOpenDirectMessage([activeChildId], teacherIds);
    setIsTalkModalOpen(false);
    resetTalkModal();
  };

  const attendanceSummary = useMemo(() => {
    if (!selectedChild || selectedChildLogs.length === 0) {
      return null;
    }

    const parsedLogs = selectedChildLogs
      .map((log) => {
        const parsed = new Date(log.dateLogged);
        return Number.isNaN(parsed.getTime()) ? null : { log, parsed };
      })
      .filter(
        (entry): entry is { log: LogEntry; parsed: Date } => entry !== null
      );

    if (parsedLogs.length === 0) {
      return null;
    }

    const logsByDate = new Map<string, Array<{ log: LogEntry; parsed: Date }>>();
    const dateLookup = new Map<string, Date>();
    parsedLogs.forEach((entry) => {
      const key = makeLocalDateKey(entry.parsed);
      const group = logsByDate.get(key) ?? [];
      group.push(entry);
      logsByDate.set(key, group);
      if (!dateLookup.has(key)) {
        dateLookup.set(key, entry.parsed);
      }
    });

    const dateKeys = Array.from(logsByDate.keys()).sort();
    if (dateKeys.length === 0) {
      return null;
    }

    const todayKey = makeLocalDateKey(new Date());
    const fallbackIndex = dateKeys.includes(todayKey)
      ? dateKeys.indexOf(todayKey)
      : dateKeys.length - 1;
    const selectedIndex =
      attendanceDateIndex !== null &&
      attendanceDateIndex >= 0 &&
      attendanceDateIndex < dateKeys.length
        ? attendanceDateIndex
        : fallbackIndex;

    const selectedKey = dateKeys[selectedIndex];
    const dayLogs = logsByDate.get(selectedKey) ?? [];
    const prevKey = selectedIndex > 0 ? dateKeys[selectedIndex - 1] : null;
    const nextKey =
      selectedIndex < dateKeys.length - 1 ? dateKeys[selectedIndex + 1] : null;
      const timeInEntry = dayLogs
        .filter((entry) => entry.log.logType === "IN")
        .sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0];
      const timeOutEntry = dayLogs
        .filter((entry) => entry.log.logType === "OUT")
        .sort((a, b) => b.parsed.getTime() - a.parsed.getTime())[0];
      const hasAbsent = dayLogs.some((entry) => entry.log.logType === "ABSENT");

      const timeInLabel = formatAttendanceTime(timeInEntry?.parsed ?? null, "--");
      const timeOutLabel = timeOutEntry
        ? formatAttendanceTime(timeOutEntry.parsed, "still in school")
        : timeInEntry
          ? "still in school"
          : "--";

    const lateCutoffMinutes = 8 * 60 + 15;
      const timeInMinutes = timeInEntry
        ? timeInEntry.parsed.getHours() * 60 + timeInEntry.parsed.getMinutes()
        : null;
      const isLate = timeInMinutes !== null && timeInMinutes > lateCutoffMinutes;
      const statusLabel = timeInEntry
        ? isLate
          ? "( Late )"
          : "( On time )"
        : hasAbsent
          ? "( Absent )"
          : "";

      return {
        dateLabel: formatAttendanceDate(dateLookup.get(selectedKey) ?? new Date(), selectedKey),
        timeInLabel,
      timeOutLabel,
      statusLabel,
      isLate,
      canGoPrev: selectedIndex > 0,
      canGoNext: selectedIndex < dateKeys.length - 1,
      selectedIndex,
      prevLabel: prevKey ? formatAttendanceDate(dateLookup.get(prevKey) ?? new Date(), prevKey) : "",
      nextLabel: nextKey ? formatAttendanceDate(dateLookup.get(nextKey) ?? new Date(), nextKey) : "",
    };
  }, [attendanceDateIndex, selectedChild, selectedChildLogs]);

  const content = isLoading ? (
    <View style={styles.container}>
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonCard} />
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonSearch} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
    </View>
  ) : (
    <ScrollView
      contentContainerStyle={styles.container}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      stickyHeaderIndices={[2]}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Text style={styles.pageTitle}>
        {selectedChild?.fullName || "Child"}'s Record
      </Text>

      <Card style={styles.sectionCard}>
        {/* <View style={styles.sectionBody}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View> */}
        <Pressable
          style={styles.childDropdownTrigger}
          onPress={() => setIsChildMenuOpen(true)}
        >
          <View style={styles.childDropdownInfo}>
            <Text style={styles.childDropdownLabel}>Tap to switch child</Text>
            <Text style={styles.childDropdownValue}>
              {selectedChild?.fullName || "Select a child"}
            </Text>
            {/* <Text style={styles.childDropdownHint}>Tap to switch</Text> */}
          </View>
          <Ionicons name="chevron-down" size={18} color="#1A73E8" />
        </Pressable>
        <Modal transparent visible={isChildMenuOpen} animationType="fade">
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setIsChildMenuOpen(false)}
          >
            <Pressable style={styles.dropdownCard} onPress={() => {}}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Child</Text>
                <Pressable
                  style={styles.dropdownClose}
                  onPress={() => setIsChildMenuOpen(false)}
                >
                  <Ionicons name="close" size={18} color="#0F172A" />
                </Pressable>
              </View>
              <View style={styles.dropdownDivider} />
              {filteredChildren.length === 0 ? (
                <Text style={styles.emptyText}>No children match that search.</Text>
              ) : (
                <ScrollView
                  style={styles.dropdownList}
                  contentContainerStyle={styles.dropdownListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {filteredChildren.map((child) => {
                    const isSelected = child.id === activeChildId;
                    const rawPhone = child.phone?.trim() ?? "";
                    const phoneText =
                      rawPhone && rawPhone.toLowerCase() !== "n/a"
                        ? rawPhone
                        : "No phone number";
                    return (
                      <Pressable
                        key={child.id}
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          isSelected && styles.dropdownItemActive,
                          pressed && styles.pressablePressed,
                        ]}
                        onPress={() => {
                          onSelectChild(child.id);
                          setIsChildMenuOpen(false);
                        }}
                      >
                        <View style={styles.dropdownItemLeft}>
                          {child.cardImage ? (
                            <Image
                              source={{ uri: child.cardImage }}
                              style={styles.childAvatar}
                            />
                          ) : (
                            <View style={styles.childAvatarFallback}>
                              <Ionicons name="person-outline" size={16} color="#4195BA" />
                            </View>
                          )}
                          <View style={styles.childInfo}>
                            <Text style={styles.childName}>{child.fullName}</Text>
                            <Text style={styles.childGrade}>{child.grade}</Text>
                            <Text style={styles.childPhone}>{phoneText}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.dropdownCheck,
                            isSelected && styles.dropdownCheckActive,
                          ]}
                        >
                          {isSelected ? (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.dropdownFooter}>
                <Text style={styles.paginationText}>
                  Showing 1 to {showingCount} of {totalEntries} children
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </Card>

      <View
        style={[
          styles.snapshotStickyWrap,
          isSnapshotSticky && styles.snapshotStickyWrapStuck,
        ]}
        onLayout={handleSnapshotLayout}
      >
        {selectedChild ? (
          <Card
            style={[
              styles.snapshotGroupCard,
              isSnapshotSticky && styles.snapshotGroupCardStuck,
            ]}
          >
            <View style={styles.snapshotHeader}>
              {selectedChild.cardImage ? (
                <Image
                  source={{ uri: selectedChild.cardImage }}
                  style={styles.snapshotImage}
                />
              ) : (
                <View style={styles.snapshotImageFallback}>
                  <Ionicons name="person-outline" size={24} color="#4195BA" />
                </View>
              )}
              <View style={styles.snapshotMeta}>
                <Text style={styles.snapshotName}>{selectedChild.fullName}</Text>
                <Text style={styles.snapshotSection}>
                  {selectedChild.assignedSection || selectedChild.grade}
                </Text>
                <Text style={styles.snapshotData}>ID: {selectedChild.studentId}</Text>
              </View>
            </View>
            <View style={styles.snapshotStats}>
              {snapshotItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.snapshotRow,
                  index === snapshotItems.length - 1 && styles.snapshotRowLast,
                ]}
              >
                <Text style={styles.snapshotStatLabel}>{item.label}</Text>
                <Text style={styles.snapshotStatValue}>{item.value}</Text>
              </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.emptyText}>No child selected yet.</Text>
          </Card>
        )}
      </View>

      <Card style={styles.sectionCard}>
        <View style={styles.attendanceCard}>
          {attendanceSummary ? (
            <>
              <View style={styles.attendanceHeader}>
                <Text style={styles.attendanceDate}>{attendanceSummary.dateLabel}</Text>
              </View>
              <View style={styles.attendanceColumns}>
                <View style={styles.attendanceColumn}>
                  <Text style={styles.attendanceLabel}>Time in</Text>
                  <Text style={styles.attendanceValue}>{attendanceSummary.timeInLabel}</Text>
                  {attendanceSummary.statusLabel ? (
                    <Text
                      style={[
                        styles.attendanceStatus,
                        attendanceSummary.isLate
                          ? styles.attendanceStatusLate
                          : styles.attendanceStatusOnTime,
                      ]}
                    >
                      {attendanceSummary.statusLabel}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.attendanceColumn, styles.attendanceColumnRight]}>
                  <Text style={[styles.attendanceLabel, styles.attendanceRight]}>
                    Time Out
                  </Text>
                  <Text style={[styles.attendanceValue, styles.attendanceRight]}>
                    {attendanceSummary.timeOutLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.attendanceNav}>
                <Pressable
                  style={[
                    styles.attendanceNavButton,
                    !attendanceSummary.canGoPrev && styles.attendanceNavButtonDisabled,
                  ]}
                  onPress={() =>
                    setAttendanceDateIndex(attendanceSummary.selectedIndex - 1)
                  }
                  disabled={!attendanceSummary.canGoPrev}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={
                      attendanceSummary.canGoPrev ? "#0F172A" : "#94A3B8"
                    }
                  />
                  <Text
                    style={[
                      styles.attendanceNavText,
                      !attendanceSummary.canGoPrev && styles.attendanceNavTextDisabled,
                    ]}
                  >
                    {attendanceSummary.prevLabel}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.attendanceNavButton,
                    !attendanceSummary.canGoNext && styles.attendanceNavButtonDisabled,
                  ]}
                  onPress={() =>
                    setAttendanceDateIndex(attendanceSummary.selectedIndex + 1)
                  }
                  disabled={!attendanceSummary.canGoNext}
                >
                  <Text
                    style={[
                      styles.attendanceNavText,
                      !attendanceSummary.canGoNext && styles.attendanceNavTextDisabled,
                    ]}
                  >
                    {attendanceSummary.nextLabel}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={
                      attendanceSummary.canGoNext ? "#0F172A" : "#94A3B8"
                    }
                  />
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No attendance logs yet.</Text>
          )}
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.inboxHeaderRow}>
          <Text style={styles.sectionTitle}>Latest Updates</Text>
          {/* <View style={styles.iconBadgeWrap}>
            <Ionicons name="notifications" size={24} color="#1F6FEB" />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </View> */}
        </View>
        <View style={styles.inboxList}>
          {inboxItems.length === 0 ? (
            <Text style={styles.emptyText}>No inbox messages yet.</Text>
          ) : (
            inboxItems.map((item) => (
              <NotificationItem
                key={item.id}
                email={item}
                isActive={item.id === activeEmailId}
                onPress={() => onSelectEmail(item.id)}
              />
            ))
          )}
        </View>
      </Card>
    </ScrollView>
  );

  const talkModal = (
    <Modal transparent visible={isTalkModalOpen} animationType="fade">
      <Pressable
        style={styles.talkModalBackdrop}
        onPress={() => {
          setIsTalkModalOpen(false);
          resetTalkModal();
        }}
      >
        <Pressable style={styles.talkModalCard} onPress={() => {}}>
          <Text style={styles.talkModalTitle}>
            {selectedChild?.fullName ?? "Selected Student"} Teacher
          </Text>
          <Text style={styles.talkModalSubtitle}>Tap a teacher to continue</Text>

          <View style={styles.talkSection}>
            <Text style={styles.talkLabel}>
              Select Teacher <Text style={styles.talkAsterisk}>*</Text>
            </Text>
            <ScrollView style={styles.talkTeacherList} nestedScrollEnabled>
              {isTalkTeachersLoading ? (
                <Text style={styles.talkEmptyText}>Loading teachers...</Text>
              ) : talkTeachers.length > 0 ? (
                <>
                  <Pressable
                    onPress={handleTalkTeacherSelectAll}
                    style={({ pressed }) => [
                      styles.talkTeacherCard,
                      pressed && styles.talkTeacherCardPressed,
                      pressed && styles.pressablePressed,
                    ]}
                  >
                    <View style={styles.talkTeacherAvatar}>
                      <Ionicons name="people-outline" size={18} color="#64748B" />
                    </View>
                    <View style={styles.talkTeacherInfo}>
                      <Text style={styles.talkTeacherName}>All teachers</Text>
                      <View style={styles.talkTeacherMeta}>
                        <Text style={styles.talkTeacherSubject}>
                          Message everyone in this student's list
                        </Text>
                      </View>
                    </View>
                    <View style={styles.talkTeacherIndicator} />
                  </Pressable>
                  {talkTeachers.map((teacher) => {
                    const presence = getPresence(teacher.presenceId ?? teacher.id);
                    return (
                      <Pressable
                        key={teacher.id}
                        onPress={() => handleTalkTeacherSelect(teacher.id)}
                        style={({ pressed }) => [
                          styles.talkTeacherCard,
                          pressed && styles.talkTeacherCardPressed,
                          pressed && styles.pressablePressed,
                        ]}
                      >
                        <View style={styles.talkTeacherAvatar}>
                          {teacher.cardImage ? (
                            <Image
                              source={{ uri: teacher.cardImage }}
                              style={styles.talkTeacherAvatarImage}
                            />
                          ) : (
                            <Ionicons name="person-outline" size={18} color="#64748B" />
                          )}
                        </View>
                        <View style={styles.talkTeacherInfo}>
                          <Text style={styles.talkTeacherName}>{teacher.name}</Text>
                          <View style={styles.talkTeacherMeta}>
                            <Text style={styles.talkTeacherSubject}>{teacher.subject}</Text>
                            <View style={styles.talkPresence}>
                              <View
                                style={[
                                  styles.talkPresenceDot,
                                  { backgroundColor: presence.color },
                                ]}
                              />
                              <Text style={styles.talkPresenceText}>{presence.label}</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.talkTeacherIndicator} />
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <Text style={styles.talkEmptyText}>
                  {activeChildId ? "No teachers found." : "No student selected."}
                </Text>
              )}
            </ScrollView>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );

  const lateNightModal = (
    <Modal transparent visible={isLateNightModalOpen} animationType="fade">
      <Pressable
        style={styles.talkModalBackdrop}
        onPress={() => setIsLateNightModalOpen(false)}
      >
        <Pressable style={styles.talkModalCard} onPress={() => {}}>
          <Text style={styles.talkModalTitle}>Late night notice</Text>
          <Text style={styles.talkModalSubtitle}>
            It is late right now. Your teacher may be asleep, but you can still
            send a message.
          </Text>
          <View style={styles.lateNightActions}>
            <Pressable
              style={[styles.lateNightButton, styles.lateNightCancel]}
              onPress={() => setIsLateNightModalOpen(false)}
            >
              <Text style={styles.lateNightCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.lateNightButton, styles.lateNightContinue]}
              onPress={() => {
                setIsLateNightModalOpen(false);
                resetTalkModal();
                if (activeChildId) {
                  setSelectedTalkStudentIds([activeChildId]);
                }
                setIsTalkModalOpen(true);
              }}
            >
              <Text style={styles.lateNightContinueText}>Continue</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return Platform.OS === "ios" ? (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      {content}
      {lateNightModal}
      {talkModal}
      <Pressable style={styles.talkFab} onPress={handleOpenTalkModal}>
        <View style={styles.talkFabLabel}>
          <Text style={styles.talkFabLabelText}>Talk to Teacher</Text>
        </View>
        <View style={styles.talkFabBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.screen}>
      {content}
      {lateNightModal}
      {talkModal}
      <Pressable style={styles.talkFab} onPress={handleOpenTalkModal}>
        <View style={styles.talkFabLabel}>
          <Text style={styles.talkFabLabelText}>Talk to Teacher</Text>
        </View>
        <View style={styles.talkFabBubble}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: "#F3F4F6",
    gap: 16,
  },
  pageTitle: {
    fontSize: 20,
    marginTop: 6,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
  },
  childDropdownTrigger: {
    borderWidth: 1,
    borderColor: "#b7edf5c5",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EAFBFF",
  },
  childDropdownInfo: {
    flex: 1,
    paddingRight: 12,
  },
  childDropdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#138BA6",
  },
  childDropdownValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 6,
  },
  childDropdownHint: {
    fontSize: 11,
    color: "#5C7A8E",
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  childGrade: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },
  childPhone: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  childAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  childAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E6F3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paginationText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  pageBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A8FB7",
    paddingHorizontal: 6,
  },
  pageBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  paginationControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  paginationMuted: {
    fontSize: 12,
    color: "#94A3B8",
  },
  snapshotGroupCard: {
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  snapshotGroupCardStuck: {
    borderRadius: 0,
    shadowColor: "#0f172a",
  },
  snapshotStickyWrap: {
    backgroundColor: "#F3F4F6",
    paddingBottom: 8,
    borderRadius: 0,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    alignSelf: "stretch",
    zIndex: 2,
  },
  snapshotStickyWrapStuck: {
    paddingHorizontal: 0,
  },
  snapshotHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    // paddingBottom: 12,
    gap: 12,
    // borderBottomWidth: 1,
    // borderBottomColor: "#EEF2F7",
  },
  snapshotImage: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  snapshotImageFallback: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#E6F3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotMeta: {
    flex: 1,
  },
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  snapshotRowLast: {
    borderBottomWidth: 0,
  },
  snapshotStats: {
    display: "none",
    paddingTop: 10,
  },
  attendanceCard: {
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  attendanceHeader: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    alignItems: "center",
  },
  attendanceDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "center",
  },
  attendanceColumns: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  attendanceColumn: {
    flex: 1,
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  attendanceColumnRight: {
    paddingLeft: 12,
    paddingRight: 0,
  },
  attendanceLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  attendanceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
    textAlign: "center",
  },
  attendanceStatus: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  attendanceStatusLate: {
    color: "#EC4899",
  },
  attendanceStatusOnTime: {
    color: "#16A34A",
  },
  attendanceNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  attendanceNavButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "transparent",
    minWidth: 120,
  },
  attendanceNavButtonDisabled: {
    opacity: 0.5,
  },
  attendanceNavText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  attendanceNavTextDisabled: {
    color: "#94A3B8",
  },
  attendanceRight: {
    textAlign: "center",
  },
  snapshotName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  snapshotSection: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
  },
  snapshotData: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginTop: 4,
  },
  snapshotStatLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  snapshotStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  skeletonTitle: {
    width: 220,
    height: 16,
    borderRadius: 10,
  },
  skeletonCard: {
    width: "100%",
    height: 140,
    borderRadius: 16,
  },
  skeletonSearch: {
    height: 44,
    borderRadius: 14,
  },
  skeletonRow: {
    height: 54,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  inboxHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  iconBadgeWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E02424",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    position: "absolute",
    top: -6,
    right: -6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  inboxList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dropdownCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dropdownClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 12,
    marginBottom: 14,
  },
  dropdownList: {
    maxHeight: 320,
  },
  dropdownListContent: {
    paddingBottom: 6,
    gap: 12,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  dropdownItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  dropdownItemActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#F0F9FF",
  },
  dropdownFooter: {
    marginTop: 10,
    alignItems: "center",
  },
  dropdownCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  dropdownCheckActive: {
    borderColor: "#0EA5E9",
    backgroundColor: "#0EA5E9",
  },
  pressablePressed: {
    opacity: 0.72,
  },
  talkFab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 30,
  },
  talkFabLabel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  talkFabLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  talkFabBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3A8FB7",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  talkModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  talkModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  talkModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  talkModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 12,
  },
  talkSection: {
    marginBottom: 14,
  },
  talkLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  talkAsterisk: {
    color: "#EF4444",
  },
  talkTeacherList: {
    maxHeight: 260,
  },
  talkTeacherCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  talkTeacherCardPressed: {
    backgroundColor: "#F1F5F9",
  },
  talkTeacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  talkTeacherAvatarImage: {
    width: "100%",
    height: "100%",
  },
  talkTeacherInfo: {
    flex: 1,
  },
  talkTeacherMeta: {
    marginTop: 2,
    gap: 4,
  },
  talkTeacherName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  talkTeacherSubject: {
    fontSize: 12,
    color: "#64748B",
  },
  talkPresence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  talkPresenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  talkPresenceText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  talkTeacherIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  talkEmptyText: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    paddingVertical: 14,
  },
  lateNightActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  lateNightButton: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  lateNightCancel: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  lateNightContinue: {
    borderColor: "#0EA5E9",
    backgroundColor: "#0EA5E9",
  },
  lateNightCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  lateNightContinueText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default DashboardScreen;
