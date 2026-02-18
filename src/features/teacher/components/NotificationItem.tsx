import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Notification } from "../types";
import { stripHtml } from "../../../shared/helpers/text";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Props = {
  email: Notification;
  isActive: boolean;
  onPress: () => void;
};

const extractEmailPreview = (emailMessage: string) => {
  const messageMatch = emailMessage.match(
    /<div[^>]*class=['"]message['"][^>]*>([\s\S]*?)<\/div>/i
  );

  const rawText = stripHtml(messageMatch ? messageMatch[1] : emailMessage)
    .replace(/\s+/g, " ")
    .trim();
  const messageText = rawText.replace(/^Here's a quick update for you\.?\s*/i, "").trim();
  return { messageText };
};

const formatTimeOnly = (datetime: string) => {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) {
    return datetime;
  }
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const NotificationItem = ({ email, isActive, onPress }: Props) => {
  const { theme } = useTheme();
  const isUnread = email.readStatus === "unread";
  const isRead = !isUnread;
  const { messageText } = extractEmailPreview(email.emailMessage);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, isActive && styles.containerActive, isUnread && styles.unread]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
          <Ionicons
            name={email.readStatus === "read" ? "mail-open-outline" : "mail-unread-outline"}
            size={20}
            color={isActive ? "#EAF6FF" : theme.colors.primary}
          />
        </View>
        <View style={styles.textWrap}>
          <View style={styles.topRow}>
            <Text
              style={[styles.subject, isRead && !isActive && styles.subjectRead, isActive && styles.subjectActive]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {email.subject}
            </Text>
            <Text style={[styles.time, isActive && styles.timeActive]} numberOfLines={1}>
              {formatTimeOnly(email.datetimeSend)}
            </Text>
          </View>
          {messageText.length > 0 ? (
            <Text
              style={[styles.preview, isRead && !isActive && styles.previewRead, isActive && styles.previewActive]}
              numberOfLines={1}
            >
              {messageText}
            </Text>
          ) : null}
        </View>
        {isUnread && <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignSelf: "stretch",
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
    position: "relative",
  },
  containerActive: {
    backgroundColor: "#3A8FB7",
    borderColor: "#3A8FB7",
  },
  unread: {
    borderColor: "#B6E3FF",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F0FF",
  },
  iconWrapActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  textWrap: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  subject: {
    flex: 1,
    marginRight: 8,
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1B2B",
    lineHeight: 20,
  },
  subjectActive: {
    color: "#FFFFFF",
  },
  subjectRead: {
    color: "#64748B",
  },
  preview: {
    fontSize: 13,
    color: "#334155",
    marginTop: 6,
    lineHeight: 18,
  },
  previewActive: {
    color: "#E6F5FF",
  },
  previewRead: {
    color: "#94A3B8",
  },
  time: {
    flexShrink: 0,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  timeActive: {
    color: "#E6F5FF",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginTop: 4,
  },
});

export default NotificationItem;
