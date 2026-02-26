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
      style={[
        styles.container,
        {
          backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
          borderColor: isActive ? theme.colors.primary : theme.colors.border,
        },
        isUnread && { borderColor: isActive ? theme.colors.primary : `${theme.colors.primary}55` },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: `${theme.colors.primary}14` },
            isActive && { backgroundColor: "rgba(255,255,255,0.2)" },
          ]}
        >
          <Ionicons
            name={email.readStatus === "read" ? "mail-open-outline" : "mail-unread-outline"}
            size={20}
            color={isActive ? theme.colors.surface : theme.colors.primary}
          />
        </View>
        <View style={styles.textWrap}>
          <View style={styles.topRow}>
            <Text
              style={[
                styles.subject,
                isUnread && styles.subjectUnread,
                isRead && !isActive && styles.subjectRead,
                isActive && { color: theme.colors.surface },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {email.subject}
            </Text>
            <Text
              style={[
                styles.time,
                { color: isActive ? theme.colors.surface : theme.colors.text },
                isUnread && { color: theme.colors.primary },
              ]}
              numberOfLines={1}
            >
              {formatTimeOnly(email.datetimeSend)}
            </Text>
          </View>
          {messageText.length > 0 ? (
            <Text
              style={[
                styles.preview,
                isUnread && styles.previewUnread,
                isRead && !isActive && styles.previewRead,
                isActive && { color: theme.colors.surface },
              ]}
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
  containerActive: {},
  unread: {},
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
  iconWrapActive: {},
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
    fontWeight: "400",
    color: "#0B1B2B",
    lineHeight: 20,
  },
  subjectUnread: {
    fontWeight: "700",
  },
  subjectRead: {
    color: "#64748B",
  },
  subjectActive: {},
  preview: {
    fontSize: 13,
    color: "#334155",
    marginTop: 6,
    lineHeight: 18,
  },
  previewUnread: {
    color: "#1E293B",
  },
  previewRead: {
    color: "#94A3B8",
  },
  previewActive: {},
  time: {
    flexShrink: 0,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  timeActive: {},
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginTop: 4,
  },
});

export default NotificationItem;
