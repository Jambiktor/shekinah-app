import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RenderHtml from "react-native-render-html";

import { Notification } from "../types";
import { formatEmailDate } from "../../../shared/helpers/date";

type Props = {
  email: Notification | null;
  onBack: () => void;
};

const MessageScreen = ({ email, onBack }: Props) => {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="chevron-back" size={18} color="#1A73E8" />
        <Text style={styles.backButtonText}>Back to Inbox</Text>
      </Pressable>
      {email ? (
        <ScrollView contentContainerStyle={styles.messageContent}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageTitle}>{email.subject}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>
                  {email.status === "sent" ? "Sent" : "Not Sent"}
                </Text>
              </View>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.messageMeta}>To: {email.email}</Text>
              <Text style={styles.messageMeta}>Date: {formatEmailDate(email.datetimeSend)}</Text>
            </View>
            <View style={styles.messageDivider} />
            <View style={styles.messagePanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelHeaderText}>School Attendance Update</Text>
              </View>
              <View style={styles.panelBody}>
                <View style={styles.quoteBlock}>
                  <RenderHtml
                    contentWidth={width - 64}
                    source={{ html: email.emailMessage }}
                    baseStyle={styles.messageBody}
                    tagsStyles={htmlStyles}
                  />
                </View>
              </View>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footer}>
              <Text style={styles.footerText}>Prefer not to receive these notifications?</Text>
              <Text style={styles.footerLink}>Unsubscribe here.</Text>
              <Text style={styles.footerNote}>
                This is an automated notification from the School Attendance System.
              </Text>
              <Text style={styles.footerCopy}>Ac 2025 Shekinah Learning School</Text>
            </View>
        </ScrollView>
      ) : (
        <View style={styles.messageEmpty}>
          <Text style={styles.emptyText}>Message not found.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    marginTop: 12,
  },
  backButtonText: {
    color: "#1A73E8",
    fontWeight: "600",
  },
  messageContent: {
    paddingBottom: 24,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    paddingRight: 10,
  },
  statusPill: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  metaBlock: {
    gap: 4,
    marginBottom: 12,
  },
  messageMeta: {
    fontSize: 13,
    color: "#475569",
  },
  messageDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  messagePanel: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  panelHeader: {
    backgroundColor: "#3A8FB7",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  panelHeaderText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  panelBody: {
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: "#3A8FB7",
    paddingLeft: 10,
  },
  messageBody: {
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 20,
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginTop: 16,
    marginBottom: 12,
  },
  footer: {
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: "#64748B",
  },
  footerLink: {
    fontSize: 12,
    color: "#1A73E8",
    fontWeight: "600",
  },
  footerNote: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
  },
  footerCopy: {
    fontSize: 11,
    color: "#94A3B8",
  },
  messageEmpty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  emptyText: {
    textAlign: "center",
    color: "#94A3B8",
  },
});

const htmlStyles = {
  p: {
    marginTop: 0,
    marginBottom: 8,
  },
  a: {
    color: "#1A73E8",
    textDecorationLine: "underline",
  },
  ul: {
    paddingLeft: 18,
    marginTop: 0,
    marginBottom: 8,
  },
  ol: {
    paddingLeft: 18,
    marginTop: 0,
    marginBottom: 8,
  },
  li: {
    marginBottom: 4,
  },
  strong: {
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
};

export default MessageScreen;
