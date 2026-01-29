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
          <SkeletonBlock style={styles.skeletonBadge} />
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
        <Text style={styles.title}>Notifications</Text>
        {/* {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        ) : null} */}
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
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    // marginTop: 12,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A8FB7",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  skeletonTitle: {
    width: 160,
    height: 18,
  },
  skeletonBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
