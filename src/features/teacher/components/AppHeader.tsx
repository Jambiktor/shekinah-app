import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Props = {
  title: string;
  onMenuPress?: () => void;
  onActionPress?: () => void;
  showNotificationIcon?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
  availability?: "Available" | "Busy" | "Offline";
  onAvailabilityChange?: (availability: "Available" | "Busy" | "Offline") => void;
};

const AppHeader = ({
  title,
  onMenuPress,
  onActionPress,
  showNotificationIcon = false,
  notificationCount = 0,
  onNotificationPress,
  availability,
  onAvailabilityChange,
}: Props) => {
  const [showAvailabilityMenu, setShowAvailabilityMenu] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const availabilityOptions: Array<{
    value: "Available" | "Busy" | "Offline";
    label: string;
    color: string;
  }> = [
    { value: "Available", label: "Available", color: "#16A34A" },
    { value: "Busy", label: "Busy", color: "#F59E0B" },
    { value: "Offline", label: "Offline", color: `${theme.colors.text}99` },
  ];

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border },
      ]}
      onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
    >
      {onMenuPress ? (
        <Pressable
          onPress={onMenuPress}
          style={[styles.menuButton, { backgroundColor: `${theme.colors.primary}14` }]}
        >
          <Ionicons name="menu-outline" size={24} color={theme.colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.brand}>
        <Text style={[styles.navTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {showNotificationIcon || availability ? (
        <View style={styles.rightActions}>
          {availability ? (
            <View style={styles.availabilityWrap}>
              <Pressable
                onPress={() => setShowAvailabilityMenu((prev) => !prev)}
                style={styles.availabilityIconButton}
              >
                <Ionicons name="person-circle" size={24} color={theme.colors.primary} />
                <View
                  style={[
                    styles.availabilityDot,
                    {
                      backgroundColor:
                        availabilityOptions.find((option) => option.value === availability)
                          ?.color ?? `${theme.colors.text}99`,
                    },
                  ]}
                />
              </Pressable>
            </View>
          ) : null}
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
          ) : null}
        </View>
      ) : onActionPress ? (
        <Pressable
          onPress={onActionPress}
          style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="log-out-outline" size={16} color={theme.colors.surface} />
          <Text style={[styles.actionText, { color: theme.colors.surface }]}>Logout</Text>
        </Pressable>
      ) : (
        <View style={styles.navSpacer} />
      )}
      {availability && showAvailabilityMenu ? (
        <Modal
          transparent
          visible={showAvailabilityMenu}
          onRequestClose={() => setShowAvailabilityMenu(false)}
        >
          <View style={styles.availabilityModalRoot}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAvailabilityMenu(false)}
            />
            <View
              style={[
                styles.availabilityMenu,
                { top: headerHeight + 6, right: 16, shadowColor: theme.colors.text },
              ]}
            >
              {availabilityOptions.map((option) => {
                const isActive = availability === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onAvailabilityChange?.(option.value);
                      setShowAvailabilityMenu(false);
                    }}
                    style={[
                      styles.availabilityMenuItem,
                      isActive && { backgroundColor: `${theme.colors.primary}12` },
                    ]}
                  >
                    <View style={[styles.availabilityMenuDot, { backgroundColor: option.color }]} />
                    <Text
                      style={[
                        styles.availabilityMenuText,
                        { color: theme.colors.text },
                        isActive && { color: theme.colors.primary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: 1,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    menuButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    navTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    iconBadgeWrap: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    rightActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    availabilityWrap: {
      position: "relative",
      zIndex: 2,
    },
    availabilityIconButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    availabilityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: "absolute",
      bottom: 4,
      right: 4,
      borderWidth: 1,
      borderColor: theme.colors.surface,
    },
    availabilityModalRoot: {
      flex: 1,
    },
    availabilityMenu: {
      position: "absolute",
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      minWidth: 140,
    },
    availabilityMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    availabilityMenuDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    availabilityMenuText: {
      fontSize: 12,
      fontWeight: "600",
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
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      height: 32,
      borderRadius: 12,
      gap: 6,
    },
    actionText: {
      fontWeight: "600",
      fontSize: 12,
    },
    navSpacer: {
      width: 32,
      height: 32,
    },
  });

export default React.memo(AppHeader);
