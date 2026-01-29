import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import SkeletonBlock from "../components/SkeletonBlock";
import { LogEntry } from "../types";

type ChildOption = {
  id: string;
  label: string;
};

type Props = {
  logs: LogEntry[];
  childOptions: ChildOption[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
  isLoading: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const toDateKey = (value: string) => {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const trimmed = value.trim();
  const parts = trimmed.split(/\s+(?=\d{1,2}:\d{2}:\d{2}\s*[AP]M\b)/i);
  const datePart = parts[0]?.trim();
  if (!datePart) {
    return null;
  }
  const fallback = new Date(datePart);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }
  const year = fallback.getFullYear();
  const month = String(fallback.getMonth() + 1).padStart(2, "0");
  const day = String(fallback.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const LogsScreen = ({
  logs,
  childOptions,
  selectedChildId,
  onSelectChild,
  isLoading,
}: Props) => {
  const [searchText, setSearchText] = useState("");
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const selectedChild =
    childOptions.find((child) => child.id === selectedChildId) ?? childOptions[0];

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => selectedChildId === "all" || log.childId === selectedChildId);
  }, [logs, selectedChildId]);

  const logsByDate = useMemo(() => {
    const grouped = new Map<string, LogEntry[]>();
    filteredLogs.forEach((log) => {
      const key = toDateKey(log.dateLogged);
      if (!key) {
        return;
      }
      const existing = grouped.get(key);
      if (existing) {
        existing.push(log);
      } else {
        grouped.set(key, [log]);
      }
    });
    return grouped;
  }, [filteredLogs]);

  useEffect(() => {
    if (filteredLogs.length === 0) {
      setSelectedDateKey(null);
      return;
    }

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    if (logsByDate.has(todayKey)) {
      setSelectedDateKey(todayKey);
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }

    const sortedKeys = Array.from(logsByDate.keys()).sort().reverse();
    const fallbackKey = sortedKeys[0] ?? null;
    setSelectedDateKey(fallbackKey);
    if (fallbackKey) {
      const [year, month] = fallbackKey.split("-").map((part) => Number(part));
      if (Number.isFinite(year) && Number.isFinite(month)) {
        setCurrentMonth(new Date(year, month - 1, 1));
      }
    }
  }, [filteredLogs.length, logsByDate]);

  const selectedLogs = useMemo(() => {
    if (!selectedDateKey) {
      return [];
    }
    const entries = logsByDate.get(selectedDateKey) ?? [];
    if (!searchText.trim()) {
      return entries;
    }
    const query = searchText.trim().toLowerCase();
    return entries.filter(
      (log) =>
        log.childName.toLowerCase().includes(query) ||
        log.dateLogged.toLowerCase().includes(query) ||
        log.logType.toLowerCase().includes(query)
    );
  }, [logsByDate, searchText, selectedDateKey]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const startWeekday = startOfMonth.getDay();
    const totalCells = 42;
    const days: { key: string; day: number; inMonth: boolean }[] = [];

    for (let index = 0; index < totalCells; index += 1) {
      const date = new Date(year, month, 1 - startWeekday + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;
      days.push({
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
      });
    }

    return days;
  }, [currentMonth]);

  const formatDateParts = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      const trimmed = dateString.trim();
      const parts = trimmed.split(/\s+(?=\d{1,2}:\d{2}:\d{2}\s*[AP]M\b)/i);
      if (parts.length >= 2) {
        return { date: parts[0].trim(), time: parts.slice(1).join(" ").trim() };
      }
      return { date: trimmed, time: "" };
    }
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  const content = isLoading ? (
    <ScrollView contentContainerStyle={styles.container} overScrollMode="never">
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonSearch} />
      <SkeletonBlock style={styles.skeletonLog} />
      <SkeletonBlock style={styles.skeletonLog} />
      <SkeletonBlock style={styles.skeletonLog} />
    </ScrollView>
  ) : (
    <ScrollView
      contentContainerStyle={styles.container}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedChild?.label ?? "Child"}'s Attendance Logs
          </Text>
          <View style={styles.childSelectWrapper}>
            <Text style={styles.childLabel}>Select Child</Text>
            <Pressable
              style={styles.childSelect}
              onPress={() => setIsChildMenuOpen((prev) => !prev)}
            >
              <Text style={styles.childSelectText}>
                {selectedChild?.label ?? "Select Child"}
              </Text>
              <Ionicons
                name={isChildMenuOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#4195BA"
              />
            </Pressable>
            {isChildMenuOpen ? (
              <View style={styles.childOptions}>
                {childOptions.map((child, index) => {
                  const isSelected = child.id === selectedChildId;
                  const isLast = index === childOptions.length - 1;
                  return (
                    <Pressable
                      key={child.id}
                      onPress={() => {
                        onSelectChild(child.id);
                        setIsChildMenuOpen(false);
                      }}
                      style={[
                        styles.childOption,
                        isLast && styles.childOptionLast,
                        isSelected && styles.childOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.childOptionText,
                          isSelected && styles.childOptionTextActive,
                        ]}
                      >
                        {child.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
          <View style={styles.calendarHeader}>
            <Pressable
              style={styles.calendarNavButton}
              onPress={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                )
              }
            >
              <Ionicons name="chevron-back" size={18} color="#1E293B" />
            </Pressable>
            <Text style={styles.calendarMonthText}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable
              style={styles.calendarNavButton}
              onPress={() =>
                setCurrentMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                )
              }
            >
              <Ionicons name="chevron-forward" size={18} color="#1E293B" />
            </Pressable>
          </View>
          <View style={styles.calendarWeekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.calendarWeekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const isSelected = day.key === selectedDateKey;
              const dayLogs = logsByDate.get(day.key) ?? [];
              const hasAbsent = dayLogs.some((log) => log.logType === "ABSENT");
              const hasPresent = dayLogs.some((log) => log.logType !== "ABSENT");
              const hasLogs = hasAbsent || hasPresent;
              const isDisabled = !hasLogs && day.inMonth;
              return (
                <Pressable
                  key={day.key}
                  style={[
                    styles.calendarDay,
                    !day.inMonth && styles.calendarDayMuted,
                    isDisabled && styles.calendarDayDisabled,
                    isSelected && styles.calendarDaySelected,
                  ]}
                  onPress={() => setSelectedDateKey(day.key)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      !day.inMonth && styles.calendarDayTextMuted,
                      isDisabled && styles.calendarDayTextDisabled,
                      isSelected && styles.calendarDayTextSelected,
                    ]}
                  >
                    {day.day}
                  </Text>
                  {hasLogs ? (
                    <View style={hasAbsent ? styles.calendarDotAbsent : styles.calendarDotPresent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.selectedDateRow}>
            <Text style={styles.selectedDateText}>
              {selectedDateKey ? `Selected: ${formatDateKey(selectedDateKey)}` : "Select a date"}
            </Text>
            <Text style={styles.selectedDateCount}>
              {selectedDateKey ? `${logsByDate.get(selectedDateKey)?.length ?? 0} logs` : ""}
            </Text>
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search selected date..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        {selectedLogs.length === 0 ? (
          <Text style={styles.emptyText}>No attendance logs found.</Text>
        ) : (
          selectedLogs.map((log) => {
            const { date, time } = formatDateParts(log.dateLogged);
            const isIn = log.logType === "IN";
            const isAbsent = log.logType === "ABSENT";
            const isOut = log.logType === "OUT";
            return (
              <View key={log.id} style={styles.logRow}>
                <View style={styles.logMeta}>
                  {selectedChildId === "all" ? (
                    <Text style={styles.logName}>{log.childName}</Text>
                  ) : null}
                  <Text style={styles.logDate}>{date}</Text>
                  <Text style={styles.logTime}>{time}</Text>
                </View>
                <View style={styles.logStatus}>
                  <View
                    style={[
                      styles.statusPill,
                      isIn ? styles.inPill : isAbsent ? styles.absentPill : styles.outPill,
                    ]}
                  >
                    <Ionicons
                      name={isIn ? "log-in-outline" : isAbsent ? "close-circle-outline" : "log-out-outline"}
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.statusText}>
                      {isIn ? "In" : isAbsent ? "Absent" : isOut ? "Out" : "Out"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
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
    paddingHorizontal: 8,
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: "#ffffff",
    gap: 12,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    // shadowColor: "#0F172A",
    // shadowOpacity: 0.08,
    // shadowRadius: 14,
    // shadowOffset: { width: 0, height: 6 },
    // elevation: 4,
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  childSelectWrapper: {
    gap: 8,
  },
  childLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  childSelect: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  childSelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  childOptions: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  childOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  childOptionLast: {
    borderBottomWidth: 0,
  },
  childOptionActive: {
    backgroundColor: "#E6F3F8",
  },
  childOptionText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  childOptionTextActive: {
    color: "#4195BA",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  calendarMonthText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  calendarWeekday: {
    width: "14.2%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 6,
    justifyContent: "space-between",
  },
  calendarDay: {
    width: "14.285%",
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginBottom: 6,
  },
  calendarDayMuted: {
    backgroundColor: "#FFFFFF",
  },
  calendarDayDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.45,
  },
  calendarDaySelected: {
    backgroundColor: "#1E88E5",
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  calendarDayTextMuted: {
    color: "#94A3B8",
  },
  calendarDayTextDisabled: {
    color: "#94A3B8",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  calendarDotPresent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginTop: 4,
  },
  calendarDotAbsent: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#DC2626",
    marginTop: 4,
  },
  selectedDateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  selectedDateCount: {
    fontSize: 12,
    color: "#64748B",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  logMeta: {
    gap: 2,
    flex: 1,
  },
  logName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  logDate: {
    fontSize: 12,
    color: "#0F172A",
  },
  logTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  logStatus: {
    width: 86,
    alignItems: "flex-end",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    minWidth: 62,
  },
  inPill: {
    backgroundColor: "#22C55E",
  },
  outPill: {
    backgroundColor: "#EF4444",
  },
  absentPill: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  skeletonTitle: {
    width: 220,
    height: 16,
    borderRadius: 10,
  },
  skeletonSearch: {
    height: 44,
    borderRadius: 14,
  },
  skeletonLog: {
    height: 90,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
  },
});

export default LogsScreen;
