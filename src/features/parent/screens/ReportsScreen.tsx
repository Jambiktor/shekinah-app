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

import Card from "../components/Card";
import SkeletonBlock from "../components/SkeletonBlock";
import { formatReportDate } from "../../../shared/helpers/date";
import { ReportStats } from "../types";

type Props = {
  stats: ReportStats;
  isLoading: boolean;
};

const ReportsScreen = ({ stats, isLoading }: Props) => {
  const [searchText, setSearchText] = useState("");
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    if (stats.children.length === 0) {
      setSelectedChildId(null);
      return;
    }

    const hasSelection = stats.children.some((child) => child.id === selectedChildId);
    if (!hasSelection) {
      setSelectedChildId(stats.children[0].id);
    }
  }, [stats.children, selectedChildId]);

  const filteredChildren = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return stats.children;
    }

    return stats.children.filter((child) => {
      return (
        child.fullName.toLowerCase().includes(query) ||
        child.email.toLowerCase().includes(query)
      );
    });
  }, [searchText, stats.children]);

  const selectedChild = useMemo(() => {
    if (!selectedChildId) {
      return null;
    }
    return stats.children.find((child) => child.id === selectedChildId) ?? null;
  }, [selectedChildId, stats.children]);

  const totalEntries = stats.summary.totalChildren || stats.children.length;
  const showingCount = Math.min(filteredChildren.length, totalEntries);

  const content = isLoading ? (
    <View style={styles.container}>
      <SkeletonBlock style={styles.skeletonTitle} />
      <View style={styles.snapshotGrid}>
        <SkeletonBlock style={styles.skeletonCard} />
        <SkeletonBlock style={styles.skeletonCard} />
        <SkeletonBlock style={styles.skeletonCard} />
        <SkeletonBlock style={styles.skeletonCard} />
      </View>
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonSearch} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
      <SkeletonBlock style={styles.skeletonRow} />
    </View>
  ) : (
    <ScrollView
      contentContainerStyle={styles.container}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>
        {selectedChild?.fullName || "Child"}'s Snapshot
      </Text>
      {selectedChild ? (
        <View style={styles.snapshotGrid}>
          <Card style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={18} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.snapshotValue}>{selectedChild.fullName}</Text>
            <Text style={styles.snapshotLabel}>STUDENT</Text>
          </Card>
          <Card style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="calendar-outline" size={18} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.snapshotValue}>{selectedChild.monthlyLogs}</Text>
            <Text style={styles.snapshotLabel}>THIS MONTH'S UPDATES</Text>
          </Card>
          <Card style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="school-outline" size={18} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.snapshotValue}>{selectedChild.presentDays}</Text>
            <Text style={styles.snapshotLabel}>DAYS AT SCHOOL</Text>
          </Card>
          <Card style={styles.snapshotCard}>
            <View style={styles.snapshotHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={18} color="#1D4ED8" />
              </View>
            </View>
            <Text style={styles.snapshotValue}>
              {formatReportDate(selectedChild.lastLogAt)}
            </Text>
            <Text style={styles.snapshotLabel}>LATEST ACTIVITY</Text>
          </Card>
        </View>
      ) : (
        <Card>
          <Text style={styles.emptyText}>No child selected yet.</Text>
        </Card>
      )}

      <Text style={styles.sectionTitle}>
        {selectedChild?.fullName || "Children"}'s Overview
      </Text>
      <Card style={styles.cardSpacing}>
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
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderText}>Child</Text>
          <Text style={styles.tableHeaderText}>Logs This Month</Text>
        </View>
        {filteredChildren.length === 0 ? (
          <Text style={styles.emptyText}>No children match that search.</Text>
        ) : (
          filteredChildren.map((child) => {
            const isActive = child.id === selectedChildId;
            return (
              <Pressable
                key={child.id}
                style={[styles.tableRow, isActive && styles.tableRowActive]}
                onPress={() => setSelectedChildId(child.id)}
              >
                <View style={styles.childInfo}>
                  <Text style={[styles.childName, isActive && styles.childNameActive]}>
                    {child.fullName}
                  </Text>
                  <Text style={[styles.childEmail, isActive && styles.childEmailActive]}>
                    {child.email}
                  </Text>
                </View>
                <View style={styles.logInfo}>
                  <View style={styles.logPills}>
                    <View
                      style={[
                        styles.logPill,
                        styles.inPill,
                        isActive && styles.logPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.logPillText,
                          isActive && styles.logPillTextActive,
                        ]}
                      >
                        {child.monthlyIn} IN
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.logPill,
                        styles.outPill,
                        isActive && styles.logPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.logPillText,
                          isActive && styles.logPillTextActive,
                        ]}
                      >
                        {child.monthlyOut} OUT
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.logTotal, isActive && styles.logTotalActive]}>
                    {child.monthlyLogs} total logs
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
        <Text style={styles.paginationText}>
          Showing 1 to {showingCount} of {totalEntries} entries
        </Text>
        <View style={styles.paginationControls}>
          <Text style={styles.paginationMuted}>Previous</Text>
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>1</Text>
          </View>
          <Text style={styles.paginationMuted}>Next</Text>
        </View>
      </Card>


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
    paddingBottom: 16,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardSpacing: {
    gap: 12,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    color: "#0F172A",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tableRowActive: {
    backgroundColor: "#3A8FB7",
    borderColor: "#3A8FB7",
  },
  childInfo: {
    flex: 1,
    paddingRight: 8,
  },
  childName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  childNameActive: {
    color: "#FFFFFF",
  },
  childEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  childEmailActive: {
    color: "#DCEFFF",
  },
  logInfo: {
    alignItems: "flex-end",
    gap: 4,
  },
  logPills: {
    flexDirection: "row",
    gap: 6,
  },
  logPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inPill: {
    backgroundColor: "#22C55E",
  },
  outPill: {
    backgroundColor: "#EF4444",
  },
  logPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  logPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  logPillTextActive: {
    color: "#EAF6FF",
  },
  logTotal: {
    fontSize: 12,
    color: "#64748B",
  },
  logTotalActive: {
    color: "#DCEFFF",
  },
  paginationText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
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
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 12,
  },
  snapshotCard: {
    width: "48%",
    gap: 6,
  },
  snapshotHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  snapshotLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  skeletonTitle: {
    width: 220,
    height: 16,
    borderRadius: 10,
  },
  skeletonCard: {
    width: "48%",
    height: 92,
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
});

export default ReportsScreen;
