import React, { useMemo, useState } from "react";
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

type DailyLogGroup = {
  key: string;
  label: string;
  total: number;
  logs: LogEntry[];
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

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

const getDayInfo = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    const fallback = formatDateParts(dateString).date;
    return {
      key: fallback.toLowerCase(),
      label: fallback,
    };
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return {
    key: `${year}-${month}-${day}`,
    label: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
  };
};

const splitPurchaseMeta = (value: string) => {
  const parts = value
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    primary: parts[0] ?? value,
    secondary: parts.slice(1).join(" • "),
  };
};

const parseAmount = (value: string): number | null => {
  if (!value) {
    return null;
  }
  const totalMatch = value.match(/total\s*[^\d-]*(-?[\d,]+(?:\.\d+)?)/i);
  const source = totalMatch?.[1];
  if (!source) {
    return null;
  }
  const numeric = source.replace(/[^\d.-]/g, "");
  if (!numeric) {
    return null;
  }
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const PurchasesScreen = ({
  logs,
  childOptions,
  selectedChildId,
  onSelectChild,
  isLoading,
}: Props) => {
  const [searchText, setSearchText] = useState("");
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
  const selectedChild =
    childOptions.find((child) => child.id === selectedChildId) ?? childOptions[0];

  const filteredLogs = useMemo(() => {
    const childFiltered = logs.filter(
      (log) => selectedChildId === "all" || log.childId === selectedChildId
    );
    const sorted = [...childFiltered].sort((a, b) => {
      const aTime = new Date(a.dateLogged).getTime();
      const bTime = new Date(b.dateLogged).getTime();
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return bTime - aTime;
      }
      if (!Number.isNaN(aTime)) {
        return -1;
      }
      if (!Number.isNaN(bTime)) {
        return 1;
      }
      return b.dateLogged.localeCompare(a.dateLogged);
    });

    const query = searchText.trim().toLowerCase();
    if (!query) {
      return sorted;
    }
    return sorted.filter(
      (log) =>
        log.childName.toLowerCase().includes(query) ||
        log.dateLogged.toLowerCase().includes(query) ||
        (log.location || "").toLowerCase().includes(query)
    );
  }, [logs, searchText, selectedChildId]);

  const groupedLogs = useMemo<DailyLogGroup[]>(() => {
    const groups: DailyLogGroup[] = [];
    const indexByKey = new Map<string, number>();

    filteredLogs.forEach((log) => {
      const dayInfo = getDayInfo(log.dateLogged);
      const existingIndex = indexByKey.get(dayInfo.key);
      const amount = parseAmount(log.location || "") ?? 0;

      if (existingIndex === undefined) {
        indexByKey.set(dayInfo.key, groups.length);
        groups.push({
          key: dayInfo.key,
          label: dayInfo.label,
          total: amount,
          logs: [log],
        });
        return;
      }

      const group = groups[existingIndex];
      group.total += amount;
      group.logs.push(log);
    });

    return groups;
  }, [filteredLogs]);

  const content = isLoading ? (
    <ScrollView contentContainerStyle={styles.container} overScrollMode="never">
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonSearch} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
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
          <Text style={styles.sectionTitle}>Kiosk Purchases</Text>
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
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search purchases..."
              value={searchText}
              onChangeText={setSearchText}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {groupedLogs.length === 0 ? (
          <Text style={styles.emptyText}>No purchase logs found.</Text>
        ) : (
          groupedLogs.map((group) => (
            <View key={group.key} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayHeaderDate}>{group.label}</Text>
                <Text style={styles.dayHeaderTotal}>
                  Total {pesoFormatter.format(group.total)}
                </Text>
              </View>
              {group.logs.map((log) => {
                const { date, time } = formatDateParts(log.dateLogged);
                const purchaseMeta = log.location ? splitPurchaseMeta(log.location) : null;
                const displayPrice = purchaseMeta?.secondary
                  ? purchaseMeta.secondary.replace(/^Total\s*/i, "").trim()
                  : "";
                return (
                  <View key={log.id} style={styles.logRow}>
                    <View style={styles.logMeta}>
                      <View style={styles.logTopRow}>
                        <Text style={styles.logStamp}>{`${date} • ${time}`}</Text>
                        <View style={styles.purchaseBadge}>
                          <Ionicons name="cart-outline" size={12} color="#FFFFFF" />
                          <Text style={styles.purchaseBadgeText}>Purchase</Text>
                        </View>
                      </View>
                      {purchaseMeta ? (
                        <Text style={styles.logPurchasePrimary}>{purchaseMeta.primary}</Text>
                      ) : null}
                      {displayPrice ? (
                        <Text style={styles.logPurchasePrice}>{displayPrice}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
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
    backgroundColor: "#E5E7EB",
    gap: 12,
  },
  sectionCard: {
    backgroundColor: "transparent",
  },
  sectionHeader: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
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
  daySection: {
    marginBottom: 6,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  dayHeaderDate: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  dayHeaderTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  logRow: {
    marginHorizontal: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logMeta: {
    gap: 5,
  },
  logTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  logStamp: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  purchaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F97316",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
  },
  purchaseBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  logPurchasePrimary: {
    fontSize: 18,
    color: "#0F172A",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  logPurchasePrice: {
    fontSize: 18,
    color: "#0F172A",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  skeletonTitle: {
    width: 180,
    height: 16,
    borderRadius: 10,
  },
  skeletonSearch: {
    height: 44,
    borderRadius: 14,
  },
  skeletonRow: {
    height: 80,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
  },
});

export default PurchasesScreen;
