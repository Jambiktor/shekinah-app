import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchTeacherExcuseLetters,
  sendTeacherMessageReply,
  sendExcuseLetterStatusNotification,
  updateExcuseLetterStatus,
} from "../api/teacher/excuseLetters";

type ExcuseLetter = {
  id: string;
  studentName: string;
  roll: string;
  reason: string;
  type: "excuse_letter" | "message";
  from: string;
  date: string;
  summary: string;
  teacherResponse?: string | null;
  respondedAt?: string | null;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
};

const formatDateRange = (from: string, to: string) => {
  if (!from) {
    return "N/A";
  }
  if (!to || from === to) {
    return from;
  }
  return `${from} - ${to}`;
};

const formatTimestamp = (value: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const statusLabel = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const statusColor = {
  pending: "#F59E0B",
  approved: "#22C55E",
  rejected: "#DC2626",
};

const ExcuseLettersScreen = () => {
  const [letters, setLetters] = useState<ExcuseLetter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [activeSection, setActiveSection] = useState<"message" | "excuse_letter">(
    "message"
  );
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const [expandedSenders, setExpandedSenders] = useState<Record<string, boolean>>(
    {}
  );
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyLoadingId, setReplyLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadLetters = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetchTeacherExcuseLetters();
        if (!isActive) {
          return;
        }
        const mapped = response.letters.map((letter) => {
          const reason =
            letter.reason === "Other" && letter.custom_reason
              ? letter.custom_reason
              : letter.reason;
          return {
            id: String(letter.id),
            studentName: letter.child_name || "Student",
            roll: `Student ID #${letter.child_id}`,
            reason,
            type: letter.type ?? "excuse_letter",
            from: letter.parent_name || "Parent",
            date: formatDateRange(letter.date_from, letter.date_to),
            summary: letter.message,
            teacherResponse: letter.teacher_response ?? null,
            respondedAt: letter.responded_at ?? null,
            submittedAt: formatTimestamp(letter.submitted_at),
            status: letter.status,
          } as ExcuseLetter;
        });
        setLetters(mapped);
      } catch (error) {
        if (!isActive) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Unable to load excuse letters.";
        setErrorMessage(message);
        setLetters([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadLetters();
    return () => {
      isActive = false;
    };
  }, []);

  const sectionLetters = useMemo(
    () => letters.filter((letter) => letter.type === activeSection),
    [activeSection, letters]
  );

  const reasonOptions = useMemo(
    () => Array.from(new Set(sectionLetters.map((letter) => letter.reason).filter(Boolean))),
    [sectionLetters]
  );

  useEffect(() => {
    if (reasonFilter !== "all" && !reasonOptions.includes(reasonFilter)) {
      setReasonFilter("all");
    }
  }, [reasonFilter, reasonOptions]);

  useEffect(() => {
    if (!isTopicMenuOpen) {
      return;
    }
    if (reasonOptions.length === 0) {
      setIsTopicMenuOpen(false);
    }
  }, [isTopicMenuOpen, reasonOptions.length]);

  const filteredLetters = useMemo(() => {
    const bySection = sectionLetters;
    const byStatus =
      statusFilter === "all"
        ? bySection
        : bySection.filter((letter) => letter.status === statusFilter);
    if (reasonFilter === "all") {
      return byStatus;
    }
    return byStatus.filter((letter) => letter.reason === reasonFilter);
  }, [reasonFilter, sectionLetters, statusFilter]);

  const groupedMessages = useMemo(() => {
    if (activeSection !== "message") {
      return [];
    }
    const groups = new Map<string, ExcuseLetter[]>();
    filteredLetters.forEach((letter) => {
      const key = letter.from || "Parent";
      const list = groups.get(key) ?? [];
      list.push(letter);
      groups.set(key, list);
    });
    const parseTime = (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };
    return Array.from(groups.entries())
      .map(([sender, items]) => {
        const sortedItems = [...items].sort(
          (a, b) => parseTime(b.submittedAt) - parseTime(a.submittedAt)
        );
        return {
          sender,
          items: sortedItems,
          latestAt: parseTime(sortedItems[0]?.submittedAt ?? ""),
        };
      })
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [activeSection, filteredLetters]);

  const statusCounts = useMemo(
    () => ({
      pending: sectionLetters.filter((letter) => letter.status === "pending").length,
      approved: sectionLetters.filter((letter) => letter.status === "approved").length,
      rejected: sectionLetters.filter((letter) => letter.status === "rejected").length,
    }),
    [sectionLetters]
  );

  const handleUpdateStatus = async (
    letterId: string,
    status: "approved" | "rejected"
  ) => {
    setActionLoadingId(letterId);
    setErrorMessage(null);
    try {
      const response = await updateExcuseLetterStatus(letterId, status);
      if (!response.success) {
        throw new Error(response.message || "Update failed.");
      }
      setLetters((prev) =>
        prev.map((letter) =>
          letter.id === letterId ? { ...letter, status } : letter
        )
      );
      try {
        const notifyResponse = await sendExcuseLetterStatusNotification(
          letterId,
          status
        );
        if (!notifyResponse.success) {
          throw new Error(
            notifyResponse.message || "Notification request failed."
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Excuse letter updated, but notification failed.";
        setErrorMessage(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update excuse letter.";
      setErrorMessage(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReply = async (letterId: string) => {
    const replyText = replyDrafts[letterId]?.trim() ?? "";
    if (!replyText) {
      setErrorMessage("Please enter a reply before sending.");
      return;
    }

    setReplyLoadingId(letterId);
    setErrorMessage(null);
    try {
      const response = await sendTeacherMessageReply(letterId, replyText);
      if (!response.success) {
        throw new Error(response.message || "Send failed.");
      }
      setLetters((prev) =>
        prev.map((letter) =>
          letter.id === letterId
            ? { ...letter, status: "approved", teacherResponse: replyText }
            : letter
        )
      );
      setReplyDrafts((prev) => ({ ...prev, [letterId]: "" }));
      setOpenReplies((prev) => ({ ...prev, [letterId]: false }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to send reply.";
      setErrorMessage(message);
    } finally {
      setReplyLoadingId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Messages</Text>
      <Text style={styles.sectionSubtitle}>Manage parent messages and excuse letters</Text>


      <View style={styles.statusRow}>
        <Pressable
          style={[styles.statusCard, statusFilter === "pending" && styles.statusCardActive]}
          onPress={() =>
            setStatusFilter((prev) => (prev === "pending" ? "all" : "pending"))
          }
        >
          <Text style={styles.statusLabel}>Pending</Text>
          <Text style={[styles.statusValue, { color: statusColor.pending }]}>
            {statusCounts.pending}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.statusCard, statusFilter === "approved" && styles.statusCardActive]}
          onPress={() =>
            setStatusFilter((prev) => (prev === "approved" ? "all" : "approved"))
          }
        >
          <Text style={styles.statusLabel}>Approved</Text>
          <Text style={[styles.statusValue, { color: statusColor.approved }]}>
            {statusCounts.approved}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.statusCard, statusFilter === "rejected" && styles.statusCardActive]}
          onPress={() =>
            setStatusFilter((prev) => (prev === "rejected" ? "all" : "rejected"))
          }
        >
          <Text style={styles.statusLabel}>Rejected</Text>
          <Text style={[styles.statusValue, { color: statusColor.rejected }]}>
            {statusCounts.rejected}
          </Text>
        </Pressable>
      </View>

      <View style={styles.sectionTabs}>
        <Pressable
          style={[
            styles.sectionTab,
            activeSection === "message" && styles.sectionTabActive,
          ]}
          onPress={() => {
            setActiveSection("message");
            setReasonFilter("all");
            setStatusFilter("all");
          }}
        >
          <Text
            style={[
              styles.sectionTabText,
              activeSection === "message" && styles.sectionTabTextActive,
            ]}
          >
            Parent Messages
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.sectionTab,
            activeSection === "excuse_letter" && styles.sectionTabActive,
          ]}
          onPress={() => {
            setActiveSection("excuse_letter");
            setReasonFilter("all");
            setStatusFilter("all");
          }}
        >
          <Text
            style={[
              styles.sectionTabText,
              activeSection === "excuse_letter" && styles.sectionTabTextActive,
            ]}
          >
            Excuse Letters
          </Text>
        </Pressable>
      </View>

      <View style={styles.topicRow}>
        <Text style={styles.topicLabel}>Topic</Text>
        <Pressable
          style={styles.topicTrigger}
          onPress={() => setIsTopicMenuOpen((prev) => !prev)}
        >
          <Text style={styles.topicTriggerText}>
            {reasonFilter === "all" ? "All Topics" : reasonFilter}
          </Text>
          <Text style={styles.topicTriggerIcon}>{isTopicMenuOpen ? "▲" : "▼"}</Text>
        </Pressable>
        {isTopicMenuOpen ? (
          <View style={styles.topicMenu}>
            <Pressable
              style={[
                styles.topicOption,
                reasonFilter === "all" && styles.topicOptionActive,
              ]}
              onPress={() => {
                setReasonFilter("all");
                setIsTopicMenuOpen(false);
              }}
            >
              <Text
                style={[
                  styles.topicOptionText,
                  reasonFilter === "all" && styles.topicOptionTextActive,
                ]}
              >
                All Topics
              </Text>
            </Pressable>
            {reasonOptions.map((reason, index) => {
              const isLast = index === reasonOptions.length - 1;
              return (
                <Pressable
                  key={reason}
                  style={[
                    styles.topicOption,
                    isLast && styles.topicOptionLast,
                    reasonFilter === reason && styles.topicOptionActive,
                  ]}
                  onPress={() => {
                    setReasonFilter(reason);
                    setIsTopicMenuOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.topicOptionText,
                      reasonFilter === reason && styles.topicOptionTextActive,
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

      <View style={styles.lettersList}>
        {isLoading ? (
          <Text style={styles.emptyState}>Loading messages...</Text>
        ) : errorMessage ? (
          <Text style={styles.emptyState}>{errorMessage}</Text>
        ) : filteredLetters.length === 0 ? (
          <Text style={styles.emptyState}>No messages found.</Text>
        ) : (
          <>
            {activeSection === "message"
              ? groupedMessages.map((group) => {
                const isExpanded = expandedSenders[group.sender] ?? false;
                const latest = group.items[0];
                return (
                  <View key={group.sender} style={styles.groupCard}>
                    <Pressable
                      style={styles.groupHeader}
                      onPress={() =>
                        setExpandedSenders((prev) => ({
                          ...prev,
                          [group.sender]: !isExpanded,
                        }))
                      }
                    >
                      <View>
                        <Text style={styles.groupSender}>{group.sender}</Text>
                        <Text style={styles.groupMeta}>
                          {group.items.length} message
                          {group.items.length === 1 ? "" : "s"}
                          {latest?.submittedAt ? ` - ${latest.submittedAt}` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#2C77BC"
                      />
                    </Pressable>
                    {!isExpanded ? (
                      <Text style={styles.groupPreview} numberOfLines={2}>
                        {latest?.summary ? `Latest: ${latest.summary}` : ""}
                      </Text>
                    ) : (
                      <View style={styles.groupBody}>
                        {group.items.map((letter) => {
                          const color = statusColor[letter.status];
                          const statusText =
                            letter.status === "pending" ? "Awaiting Reply" : "Replied";
                          return (
                            <View
                              key={letter.id}
                              style={[styles.messageItem, { borderColor: color }]}
                            >
                              <View style={styles.messageItemHeader}>
                                <View>
                                  <Text style={styles.messageItemStudent}>
                                    {letter.studentName}
                                  </Text>
                                  <Text style={styles.messageItemMeta}>{letter.roll}</Text>
                                </View>
                                <View style={[styles.reasonPill, { backgroundColor: color }]}>
                                  <Text style={styles.reasonText}>
                                    {letter.reason.toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.messageItemSummary}>{letter.summary}</Text>
                              <View style={styles.letterFooter}>
                                <Text style={styles.letterTime}>{letter.submittedAt}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: color }]}>
                                  <Text style={styles.statusBadgeText}>{statusText}</Text>
                                </View>
                              </View>
                              {letter.status === "pending" ? (
                                openReplies[letter.id] ? (
                                  <View style={styles.replyBox}>
                                    <Text style={styles.replyLabel}>Reply to Parent</Text>
                                    <TextInput
                                      value={replyDrafts[letter.id] ?? ""}
                                      onChangeText={(value) =>
                                        setReplyDrafts((prev) => ({
                                          ...prev,
                                          [letter.id]: value,
                                        }))
                                      }
                                      placeholder="Write your reply..."
                                      placeholderTextColor="#94A3B8"
                                      multiline
                                      style={styles.replyInput}
                                    />
                                    <View style={styles.replyActions}>
                                      <Pressable
                                        style={styles.replyCancel}
                                        onPress={() =>
                                          setOpenReplies((prev) => ({
                                            ...prev,
                                            [letter.id]: false,
                                          }))
                                        }
                                        disabled={replyLoadingId === letter.id}
                                      >
                                        <Text style={styles.replyCancelText}>Cancel</Text>
                                      </Pressable>
                                      <Pressable
                                        style={[
                                          styles.replyButton,
                                          replyLoadingId === letter.id &&
                                            styles.replyButtonDisabled,
                                        ]}
                                        onPress={() => handleSendReply(letter.id)}
                                        disabled={replyLoadingId === letter.id}
                                      >
                                        <Text style={styles.replyButtonText}>
                                          {replyLoadingId === letter.id
                                            ? "Sending..."
                                            : "Send Reply"}
                                        </Text>
                                      </Pressable>
                                    </View>
                                  </View>
                                ) : (
                                  <Pressable
                                    style={styles.replyToggle}
                                    onPress={() =>
                                      setOpenReplies((prev) => ({
                                        ...prev,
                                        [letter.id]: true,
                                      }))
                                    }
                                  >
                                    <Text style={styles.replyToggleText}>Reply</Text>
                                  </Pressable>
                                )
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
              : filteredLetters.map((letter) => {
                const color = statusColor[letter.status];
                return (
                  <View key={letter.id} style={[styles.letterCard, { borderColor: color }]}>
                    <View style={styles.letterHeader}>
                      <View>
                        <Text style={styles.letterName}>{letter.studentName}</Text>
                        <Text style={styles.letterRoll}>{letter.roll}</Text>
                      </View>
                      <View style={[styles.reasonPill, { backgroundColor: color }]}>
                        <Text style={styles.reasonText}>{letter.reason.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.letterMeta}>
                      <Text style={styles.letterMetaLabel}>
                        From: <Text style={styles.letterMetaValue}>{letter.from}</Text>
                      </Text>
                      <Text style={styles.letterMetaLabel}>
                        Absence Date: <Text style={styles.letterMetaValue}>{letter.date}</Text>
                      </Text>
                    </View>

                    <View style={styles.letterDivider} />
                    <Text style={styles.letterSummary}>{letter.summary}</Text>
                    <View style={styles.letterDivider} />

                    <View style={styles.letterFooter}>
                      <Text style={styles.letterTime}>{letter.submittedAt}</Text>
                      {letter.status === "pending" ? (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={[styles.actionButton, styles.actionApprove]}
                            onPress={() => handleUpdateStatus(letter.id, "approved")}
                            disabled={actionLoadingId === letter.id}
                          >
                            <Text style={styles.actionText}>Approve</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.actionButton, styles.actionReject]}
                            onPress={() => handleUpdateStatus(letter.id, "rejected")}
                            disabled={actionLoadingId === letter.id}
                          >
                            <Text style={styles.actionText}>Reject</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, { backgroundColor: color }]}>
                          <Text style={styles.statusBadgeText}>
                            {statusLabel[letter.status]}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: "#FAFBFC",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7D8F",
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E7EDF3",
  },
  statusCardActive: {
    borderColor: "#2C77BC",
    backgroundColor: "#EFF6FF",
  },
  statusLabel: {
    fontSize: 12,
    color: "#6B7D8F",
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  topicRow: {
    marginBottom: 16,
    gap: 8,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7D8F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  topicTrigger: {
    borderWidth: 1,
    borderColor: "#E1E7ED",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  topicTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  topicTriggerIcon: {
    fontSize: 12,
    color: "#64748B",
  },
  topicMenu: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  topicOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topicOptionLast: {
    borderBottomWidth: 0,
  },
  topicOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  topicOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2B3C",
  },
  topicOptionTextActive: {
    color: "#1D4ED8",
  },
  lettersList: {
    gap: 16,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  sectionTab: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E1E7ED",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  sectionTabActive: {
    backgroundColor: "#2C77BC",
    borderColor: "#2C77BC",
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7D8F",
  },
  sectionTabTextActive: {
    color: "#FFFFFF",
  },
  emptyState: {
    fontSize: 12,
    color: "#6B7D8F",
    textAlign: "center",
    paddingVertical: 18,
  },
  letterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  letterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  letterName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 4,
  },
  letterRoll: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  reasonPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  reasonText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  letterMeta: {
    marginTop: 14,
    gap: 4,
  },
  letterMetaLabel: {
    fontSize: 12,
    color: "#6B7D8F",
  },
  letterMetaValue: {
    color: "#1A2B3C",
    fontWeight: "600",
  },
  letterDivider: {
    height: 1,
    backgroundColor: "#EEF2F5",
    marginVertical: 12,
  },
  letterSummary: {
    fontSize: 12,
    color: "#6B7D8F",
    lineHeight: 18,
  },
  letterFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  letterTime: {
    fontSize: 11,
    color: "#94A3B8",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionApprove: {
    backgroundColor: "#22C55E",
  },
  actionReject: {
    backgroundColor: "#DC2626",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  groupSender: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  groupMeta: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  groupToggle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C77BC",
  },
  groupPreview: {
    marginTop: 10,
    fontSize: 12,
    color: "#6B7D8F",
    lineHeight: 18,
  },
  groupBody: {
    marginTop: 12,
    gap: 12,
  },
  messageItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  messageItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  messageItemStudent: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  messageItemMeta: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  messageItemSummary: {
    fontSize: 12,
    color: "#6B7D8F",
    lineHeight: 18,
    marginBottom: 10,
  },
  replyBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1A2B3C",
    marginBottom: 8,
  },
  replyInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: "#1A2B3C",
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  replyButton: {
    backgroundColor: "#2C77BC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  replyButtonDisabled: {
    opacity: 0.7,
  },
  replyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  replyToggle: {
    marginTop: 10,
    alignSelf: "flex-end",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2C77BC",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  replyToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C77BC",
  },
  replyActions: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  replyCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  replyCancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
});

export default ExcuseLettersScreen;
