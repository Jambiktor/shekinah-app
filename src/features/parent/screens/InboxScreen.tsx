import React from "react";
import { StyleSheet, Text, View } from "react-native";

import NotificationList from "../components/NotificationList";
import SkeletonBlock from "../components/SkeletonBlock";
import { Notification } from "../types";

type Props = {
  emails: Notification[];
  activeEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

const InboxScreen = ({
  emails,
  activeEmailId,
  onSelectEmail,
  isLoading,
  isRefreshing,
  onRefresh,
}: Props) => {
  const unreadCount = emails.filter((email) => email.readStatus === "unread").length;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <SkeletonBlock style={styles.skeletonTitle} />
          {/* <SkeletonBlock style={styles.skeletonBadge} /> */}
        </View>
        <View style={styles.skeletonList}>
          <SkeletonBlock style={styles.skeletonItem} />
          <SkeletonBlock style={styles.skeletonItem} />
          <SkeletonBlock style={styles.skeletonItem} />
          <SkeletonBlock style={styles.skeletonItem} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Updates</Text>
      </View>
      <NotificationList
        emails={emails}
        activeEmailId={activeEmailId}
        onSelectEmail={onSelectEmail}
        isRefreshing={isRefreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 12,
  },
  skeletonTitle: {
    width: 160,
    height: 18,
  },
  skeletonBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  skeletonList: {
    gap: 12,
  },
  skeletonItem: {
    height: 68,
    borderRadius: 14,
  },
});

export default InboxScreen;
