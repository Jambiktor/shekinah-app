import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Card from "../components/Card";
import { fetchStudentLedger } from "../api/parent/ledger";
import { LedgerData } from "../types";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type ChildOption = { id: string; label: string };

type Props = {
  selectedChildId: string | null;
  onSelectChild: (childId: string | null) => void;
  childOptions: ChildOption[];
};

const currency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
};

const LedgerScreen = ({ selectedChildId, onSelectChild, childOptions }: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);

  const selectedChild = useMemo(
    () => childOptions.find((child) => child.id === selectedChildId) ?? childOptions[0] ?? null,
    [childOptions, selectedChildId]
  );

  const loadLedger = async (childId: string | null) => {
    if (!childId) {
      setLedger(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStudentLedger(childId);
      setLedger(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load ledger.";
      setError(message);
      setLedger(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChildId) {
      void loadLedger(selectedChildId);
    }
  }, [selectedChildId]);

  const feeItems = ledger?.feeItems ?? [];
  const payments = ledger?.payments ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container} overScrollMode="never" showsVerticalScrollIndicator={false}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Outstanding Balance</Text>
        </View>
        <View style={styles.childSelectWrapper}>
          <Text style={styles.childLabel}>Select Child</Text>
          <Pressable
            style={[
              styles.childSelect,
              {
                borderColor: theme.colors.primary,
                backgroundColor: `${theme.colors.primary}0F`,
              },
            ]}
            onPress={() => setIsChildMenuOpen((prev) => !prev)}
            disabled={childOptions.length === 0}
          >
            <Text style={[styles.childSelectText, { color: theme.colors.primary }]}>
              {selectedChild?.label ?? "No children"}
            </Text>
            <Ionicons
              name={isChildMenuOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.primary}
            />
          </Pressable>
          {isChildMenuOpen && childOptions.length > 0 ? (
            <View
              style={[
                styles.childOptions,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.text,
                },
              ]}
            >
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
                      { borderBottomColor: theme.colors.border },
                      isLast && styles.childOptionLast,
                      isSelected && { backgroundColor: `${theme.colors.primary}14` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.childOptionText,
                        { color: theme.colors.text },
                        isSelected && { color: theme.colors.primary },
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

        {isLoading ? (
          <View style={styles.loaderRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loaderText}>Loading ledger...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => selectedChildId && loadLedger(selectedChildId)}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : ledger ? (
          <>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Total Billed</Text>
                <Text style={styles.balanceValue}>{currency(ledger.totalBilled)}</Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Total Paid</Text>
                <Text style={styles.balanceValue}>{currency(ledger.totalPaid)}</Text>
              </View>
              <View style={[styles.balanceItem, styles.balanceOwed]}>
                <Text style={[styles.balanceLabel, styles.balanceLabelDanger]}>Balance</Text>
                <Text style={[styles.balanceValue, styles.balanceValueDanger]}>{currency(ledger.balance)}</Text>
              </View>
            </View>

            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Fee Breakdown</Text>
              {feeItems.length === 0 ? (
                <Text style={styles.emptyText}>No fee items found.</Text>
              ) : (
                feeItems.map((item) => (
                  <View key={`${item.name}-${item.dueDate ?? "none"}`} style={styles.feeRow}>
                    <View>
                      <Text style={styles.feeName}>{item.name}</Text>
                      {item.dueDate ? <Text style={styles.feeDue}>Due {item.dueDate}</Text> : null}
                    </View>
                    <Text style={styles.feeAmount}>{currency(item.amount)}</Text>
                  </View>
                ))
              )}
            </Card>

            <Card style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Recent Payments</Text>
                {ledger.lastPayment ? (
                  <Text style={styles.subtitle}>Last: {currency(ledger.lastPayment.amount)} on {ledger.lastPayment.date ?? ""}</Text>
                ) : (
                  <Text style={styles.subtitle}>No payments yet</Text>
                )}
              </View>
              {payments.length === 0 ? (
                <Text style={styles.emptyText}>No payments recorded.</Text>
              ) : (
                <FlatList
                  data={payments}
                  keyExtractor={(item) => `${item.id}`}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.paymentDivider} />}
                  renderItem={({ item }) => (
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentLeft}>
                        <Text style={styles.paymentAmount}>{currency(item.amount)}</Text>
                        <Text style={styles.paymentMeta}>{item.method || "—"}</Text>
                      </View>
                      <View style={styles.paymentRight}>
                        <Text style={styles.paymentDate}>{item.date || "Date N/A"}</Text>
                        <Text style={styles.paymentMeta}>
                          {item.receiptNumber ? `OR ${item.receiptNumber}` : item.referenceNumber ? `Ref ${item.referenceNumber}` : "No reference"}
                        </Text>
                        {(item.schoolYear || item.semester) && (
                          <Text style={styles.paymentMeta}>
                            {item.schoolYear ?? ""} {item.semester ? `• ${item.semester}` : ""}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                />
              )}
            </Card>
          </>
        ) : childOptions.length === 0 ? (
          <Text style={styles.emptyText}>No linked children yet.</Text>
        ) : (
          <Text style={styles.emptyText}>Select a child to view balance.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) =>
  StyleSheet.create({
    container: {
      padding: 16,
      gap: 16,
    },
    sectionCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#1E293B",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#0F172A",
    },
    childSelectWrapper: {
      alignItems: "flex-start",
      position: "relative",
      marginBottom: 12,
    },
    childLabel: {
      fontSize: 12,
      color: "#64748B",
      marginBottom: 4,
    },
    childSelect: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 42,
      minWidth: 200,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    childSelectText: {
      fontSize: 13,
      fontWeight: "600",
    },
    childOptions: {
      position: "absolute",
      top: 62,
      right: 0,
      left: 0,
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      zIndex: 20,
    },
    childOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
    },
    childOptionLast: {
      borderBottomWidth: 0,
    },
    childOptionText: {
      fontSize: 13,
      fontWeight: "600",
    },
    loaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
    },
    loaderText: {
      color: "#475569",
    },
    errorBox: {
      borderRadius: 12,
      padding: 12,
      backgroundColor: "#FEF2F2",
      borderWidth: 1,
      borderColor: "#FCA5A5",
      gap: 8,
    },
    errorText: {
      color: "#B91C1C",
      fontWeight: "600",
    },
    retryButton: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: "#B91C1C",
    },
    retryText: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
    balanceRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    balanceItem: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    balanceOwed: {
      backgroundColor: "#FFF1F2",
      borderColor: "#FBCFE8",
    },
    balanceLabel: {
      fontSize: 12,
      color: "#64748B",
      marginBottom: 4,
    },
    balanceLabelDanger: {
      color: "#BE123C",
    },
    balanceValue: {
      fontSize: 18,
      fontWeight: "700",
      color: "#0F172A",
    },
    balanceValueDanger: {
      color: "#BE123C",
    },
    card: {
      marginBottom: 12,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#0F172A",
    },
    subtitle: {
      fontSize: 12,
      color: "#64748B",
    },
    feeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },
    feeName: {
      fontSize: 14,
      fontWeight: "600",
      color: "#0F172A",
    },
    feeDue: {
      fontSize: 12,
      color: "#64748B",
      marginTop: 2,
    },
    feeAmount: {
      fontSize: 14,
      fontWeight: "700",
      color: "#0F172A",
    },
    emptyText: {
      color: "#64748B",
      paddingVertical: 8,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    paymentLeft: {
      maxWidth: "40%",
    },
    paymentRight: {
      alignItems: "flex-end",
      maxWidth: "60%",
    },
    paymentAmount: {
      fontSize: 15,
      fontWeight: "700",
      color: "#0F172A",
    },
    paymentMeta: {
      fontSize: 12,
      color: "#64748B",
      marginTop: 2,
    },
    paymentDate: {
      fontSize: 13,
      fontWeight: "600",
      color: "#0F172A",
    },
    paymentDivider: {
      height: 1,
      backgroundColor: "#E2E8F0",
    },
  });

export default LedgerScreen;
