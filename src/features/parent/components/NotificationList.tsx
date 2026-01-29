import React from "react";
import { FlatList, RefreshControl, StyleSheet, Text } from "react-native";

import { Notification } from "../types";
import NotificationItem from "./NotificationItem";

type Props = {
  emails: Notification[];
  activeEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

const NotificationList = ({
  emails,
  activeEmailId,
  onSelectEmail,
  onRefresh,
  isRefreshing = false,
}: Props) => {
  return (
    <FlatList
      data={emails}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      overScrollMode="never"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined
      }
      renderItem={({ item }) => (
        <NotificationItem
          email={item}
          isActive={item.id === activeEmailId}
          onPress={() => onSelectEmail(item.id)}
        />
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
  },
});

export default NotificationList;
