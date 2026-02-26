import React, { useMemo } from "react";
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
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
      ]}
    >
      <Pressable
        onPress={onMenuPress}
        style={[styles.menuButton, { backgroundColor: `${theme.colors.primary}14` }]}
      >
        <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
      </Pressable>
      <Text style={[styles.navTitle, { color: theme.colors.text }]}>{title}</Text>
      {showNotificationIcon ? (
        <Pressable onPress={onNotificationPress} style={styles.iconBadgeWrap}>
          <Ionicons name="notifications" size={22} color={theme.colors.primary} />
          {notificationCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.badgeText, { color: theme.colors.surface }]}>
                {notificationCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.surface} />
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 8,
      paddingBottom: 12,
      backgroundColor: theme.colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    menuButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    navTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
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
      borderWidth: 2,
      borderColor: theme.colors.surface,
      position: "absolute",
      top: -6,
      right: -6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    navSpacer: {
      width: 32,
      height: 32,
    },
  });

export default React.memo(AppHeader);
