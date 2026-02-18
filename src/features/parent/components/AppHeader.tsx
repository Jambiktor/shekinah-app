import React from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Props = {
  title: string;
  onMenuPress: () => void;
  onActionPress?: () => void;
  showNotificationIcon?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
};

const AppHeader = ({
  title,
  onMenuPress,
  onActionPress,
  showNotificationIcon = false,
  notificationCount = 0,
  onNotificationPress,
}: Props) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
      ]}
    >
      <Pressable
        onPress={onMenuPress}
        style={[styles.menuButton, { backgroundColor: theme.colors.background }]}
      >
        <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
      </Pressable>
      <Text style={[styles.navTitle, { color: theme.colors.text }]}>{title}</Text>
      {showNotificationIcon ? (
        <Pressable onPress={onNotificationPress} style={styles.iconBadgeWrap}>
          <Ionicons name="notifications" size={22} color={theme.colors.primary} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.actionButton}>
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 8,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E9EEF5",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeWrap: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E02424",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    position: "absolute",
    top: -6,
    right: -6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  navSpacer: {
    width: 32,
    height: 32,
  },
});

export default AppHeader;
