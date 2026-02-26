import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenKey } from "../types";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type MenuItem = {
  key: ScreenKey;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

type ChildOption = {
  id: string;
  label: string;
};

type Props = {
  isOpen: boolean;
  menuItems: MenuItem[];
  activeKey: ScreenKey;
  onSelect: (key: ScreenKey) => void;
  onClose: () => void;
  onLogout: () => void;
  onSimulateNotification: () => void;
  onShowPushToken: () => void;
  testNotificationDelaySeconds: string;
  onChangeTestNotificationDelay: (value: string) => void;
  profileName: string;
  profileRole: string;
  profileId: string;
  childOptions: ChildOption[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
};

const AppDrawer = ({
  isOpen,
  menuItems,
  activeKey,
  onSelect,
  onClose,
  onLogout,
  onSimulateNotification,
  onShowPushToken,
  testNotificationDelaySeconds,
  onChangeTestNotificationDelay,
  profileName,
  profileRole,
  profileId,
  childOptions,
  selectedChildId,
  onSelectChild,
}: Props) => {
  const drawerAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const selectedChild =
    childOptions.find((child) => child.id === selectedChildId) ?? childOptions[0];
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawerAnim, isOpen]);

  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });
  const backdropOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  return (
    <>
      <AnimatedPressable
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        onPress={onClose}
        pointerEvents={isOpen ? "auto" : "none"}
      />
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: theme.colors.surface,
            borderRightColor: theme.colors.border,
            shadowColor: theme.colors.text,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={[styles.drawerHeader, { borderBottomColor: theme.colors.border }]}>
          <View
            style={[
              styles.headerLogo,
              {
                backgroundColor: `${theme.colors.primary}14`,
                borderColor: `${theme.colors.primary}33`,
              },
            ]}
          >
            <Image
              source={
                theme.logo_url
                  ? { uri: theme.logo_url }
                  : require("../../../../assets/shekinah-logo.png")
              }
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerName, { color: theme.colors.text }]}>{profileName}</Text>
            <Text style={[styles.headerRole, { color: `${theme.colors.text}99` }]}>
              {profileRole}
            </Text>
            {/* <Text style={styles.headerId}>ID: {profileId}</Text> */}
          </View>
        </View>
        {/* Child selection is now inside the My Balance screen */ }
        {menuItems.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.drawerItem, isActive && styles.drawerItemActive]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isActive ? theme.colors.surface : theme.colors.text}
              />
              <Text
                style={[
                  styles.drawerItemText,
                  { color: isActive ? theme.colors.surface : theme.colors.text },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.drawerSpacer} />
        {/* <Pressable
          style={[
            styles.simulateButton,
            { borderColor: `${theme.colors.primary}4D`, backgroundColor: `${theme.colors.primary}14` },
          ]}
          onPress={onSimulateNotification}
        >
          <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.simulateText, { color: theme.colors.primary }]}>
            Test Notification
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.simulateButton,
            { borderColor: `${theme.colors.primary}4D`, backgroundColor: `${theme.colors.primary}14` },
          ]}
          onPress={onShowPushToken}
        >
          <Ionicons name="key-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.simulateText, { color: theme.colors.primary }]}>Show Push Token</Text>
        </Pressable>
        <View style={styles.delaySection}>
          <Text style={[styles.delayLabel, { color: theme.colors.text }]}>Test delay (seconds)</Text>
          <TextInput
            value={testNotificationDelaySeconds}
            onChangeText={onChangeTestNotificationDelay}
            placeholder="0"
            keyboardType="numeric"
            inputMode="numeric"
            style={[
              styles.delayInput,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
              },
            ]}
          />
        </View> */}
        <Pressable
          style={[
            styles.logoutButton,
            {
              borderColor: `${theme.colors.accent}55`,
              backgroundColor: `${theme.colors.accent}14`,
            },
          ]}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.accent} />
          <Text style={[styles.logoutText, { color: theme.colors.text }]}>Logout</Text>
        </Pressable>
      </Animated.View>
    </>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) =>
  StyleSheet.create({
    drawer: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: 260,
      paddingTop: 50,
      paddingHorizontal: 16,
      borderTopRightRadius: 24,
      borderBottomRightRadius: 24,
      borderRightWidth: 1,
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      zIndex: 20,
    },
    drawerHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
      paddingBottom: 12,
      borderBottomWidth: 1,
    },
    headerLogo: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    headerLogoImage: {
      width: 36,
      height: 36,
    },
    headerText: {
      flex: 1,
    },
    headerName: {
      fontSize: 14,
      fontWeight: "700",
    },
    headerRole: {
      fontSize: 12,
      marginTop: 2,
    },
    headerId: {
      fontSize: 11,
      marginTop: 2,
    },
    childSection: {
      marginBottom: 16,
      position: "relative",
      zIndex: 30,
    },
    childLabel: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    childSelect: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    childSelectText: {
      fontSize: 13,
      fontWeight: "600",
    },
    childOptions: {
      position: "absolute",
      top: 68,
      left: 0,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      overflow: "hidden",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    childOption: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
    },
    childOptionLast: {
      borderBottomWidth: 0,
    },
    childOptionActive: {},
    childOptionText: {
      fontSize: 13,
      fontWeight: "600",
    },
    childOptionTextActive: {},
    drawerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: "transparent",
    },
    drawerItemActive: {
      backgroundColor: theme.colors.primary,
    },
    drawerItemText: {
      fontSize: 14,
      fontWeight: "600",
    },
    drawerItemTextActive: {},
    drawerSpacer: {
      flex: 1,
    },
    simulateButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    simulateText: {
      fontSize: 14,
      fontWeight: "700",
    },
    delaySection: {
      marginBottom: 12,
    },
    delayLabel: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    delayInput: {
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontSize: 13,
      fontWeight: "600",
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: "600",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15, 23, 42, 0.35)",
      zIndex: 15,
    },
  });

export default React.memo(AppDrawer);
