import React, { useEffect, useRef, useState } from "react";
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
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
  const selectedChild =
    childOptions.find((child) => child.id === selectedChildId) ?? childOptions[0];

  useEffect(() => {
    if (!isOpen) {
      setIsChildMenuOpen(false);
    }
  }, [isOpen]);

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
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.headerLogo}>
            <Image
              source={require("../../../../assets/shekinah-logo.png")}
              style={styles.headerLogoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerName}>{profileName}</Text>
            <Text style={styles.headerRole}>{profileRole}</Text>
            {/* <Text style={styles.headerId}>ID: {profileId}</Text> */}
          </View>
        </View>
        {/* <View style={styles.childSection}>
          <Text style={styles.childLabel}>Select Child</Text>
          <Pressable
            style={styles.childSelect}
            onPress={() => setIsChildMenuOpen((prev) => !prev)}
          >
            <Text style={styles.childSelectText}>
              {selectedChild?.label ?? "Select Child"}
            </Text>
            <Ionicons
              name={isChildMenuOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#1A73E8"
            />
          </Pressable>
          {isChildMenuOpen ? (
            <View style={styles.childOptions}>
              {childOptions.map((child, index) => {
                const isSelected = child.id === selectedChildId;
                const isLast = index === childOptions.length - 1;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => {
                      onSelectChild(child.id);
                      setIsChildMenuOpen(false);
                    }}
                    style={[
                      styles.childOption,
                      isLast && styles.childOptionLast,
                      isSelected && styles.childOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.childOptionText,
                        isSelected && styles.childOptionTextActive,
                      ]}
                    >
                      {child.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View> */}
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
                color={isActive ? "#FFFFFF" : "#334155"}
              />
              <Text
                style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        <View style={styles.drawerSpacer} />
        {/* <Pressable style={styles.simulateButton} onPress={onSimulateNotification}>
          <Ionicons name="notifications-outline" size={18} color="#1D4ED8" />
          <Text style={styles.simulateText}>Test Notification</Text>
        </Pressable>
        <Pressable style={styles.simulateButton} onPress={onShowPushToken}>
          <Ionicons name="key-outline" size={18} color="#1D4ED8" />
          <Text style={styles.simulateText}>Show Push Token</Text>
        </Pressable>
        <View style={styles.delaySection}>
          <Text style={styles.delayLabel}>Test delay (seconds)</Text>
          <TextInput
            value={testNotificationDelaySeconds}
            onChangeText={onChangeTestNotificationDelay}
            placeholder="0"
            keyboardType="numeric"
            inputMode="numeric"
            style={styles.delayInput}
          />
        </View> */}
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </Animated.View>
      <AnimatedPressable
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        onPress={onClose}
        pointerEvents={isOpen ? "auto" : "none"}
      />
    </>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 260,
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 16,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#0F172A",
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
    borderBottomColor: "#E2E8F0",
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
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
    color: "#0F172A",
  },
  headerRole: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  headerId: {
    fontSize: 11,
    color: "#64748B",
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
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  childSelect: {
    borderWidth: 1,
    borderColor: "#1A73E8",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  childSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A73E8",
  },
  childOptions: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  childOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  childOptionLast: {
    borderBottomWidth: 0,
  },
  childOptionActive: {
    backgroundColor: "#E0F2FE",
  },
  childOptionText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  childOptionTextActive: {
    color: "#1A73E8",
  },
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
    backgroundColor: "#3A8FB7",
  },
  drawerItemText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  drawerItemTextActive: {
    color: "#FFFFFF",
  },
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
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    marginBottom: 10,
  },
  simulateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  delaySection: {
    marginBottom: 12,
  },
  delayLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  delayInput: {
    borderWidth: 1,
    borderColor: "#CBD5F5",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    backgroundColor: "#F8FAFC",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    marginBottom: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    zIndex: 10,
  },
});

export default AppDrawer;
