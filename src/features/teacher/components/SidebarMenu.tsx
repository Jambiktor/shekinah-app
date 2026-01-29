import React from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Tab } from "../screens/LandingScreen";

type SidebarMenuProps = {
  isVisible: boolean;
  menuProgress: Animated.Value;
  menuWidth: number;
  activeTab: Tab;
  profileName: string;
  onClose: () => void;
  onSelectTab: (tab: Tab) => void;
  onLogout: () => void;
};

const menuItems: Array<{ tab: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { tab: "classes", label: "Classes", icon: "home-outline" },
  { tab: "inbox", label: "Inbox", icon: "mail-outline" },
  { tab: "attendance", label: "Attendance", icon: "clipboard-outline" },
  { tab: "announcements", label: "Announcements", icon: "megaphone-outline" },
  { tab: "excuseLetters", label: "Messages", icon: "mail-outline" },
];

const SidebarMenu = ({
  isVisible,
  menuProgress,
  menuWidth,
  activeTab,
  profileName,
  onClose,
  onSelectTab,
  onLogout,
}: SidebarMenuProps) => {
  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.menuOverlay}>
      <Animated.View
        style={[
          styles.menuBackdrop,
          {
            opacity: menuProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.menuPanel,
          {
            width: menuWidth,
            transform: [
              {
                translateX: menuProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-menuWidth, 0],
                }),
              },
            ],
          },
        ]}
      >
        <SafeAreaView style={styles.menuSafeArea} edges={["top"]}>
          <View style={styles.menuHeader}>
            <View style={styles.profileRow}>
              <View style={styles.menuAvatar}>
                <Image
                  source={require("../../assets/shekinah-logo.png")}
                  style={styles.menuAvatarImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.profileName}>{profileName}</Text>
                <Text style={styles.profileRole}>Teacher</Text>
              </View>
            </View>
          </View>
          <View style={styles.menuBody}>
            <View style={styles.menuList}>
              {menuItems.map((item) => {
                const isActive = activeTab === item.tab;
                return (
                  <Pressable
                    key={item.tab}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => onSelectTab(item.tab)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isActive ? "#FFFFFF" : "#6B7D8F"}
                    />
                    <Text style={[styles.menuItemLabel, isActive && styles.menuItemLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.menuFooter}>
              <Pressable style={styles.logoutButton} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={16} color="#DC2626" />
                <Text style={styles.logoutText}>Logout</Text>
              </Pressable>
              <Text style={styles.menuFooterText}>Version 1.0.0</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26, 43, 60, 0.18)",
  },
  menuPanel: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E8ECEF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 4, height: 0 },
    elevation: 6,
  },
  menuSafeArea: {
    flex: 1,
  },
  menuHeader: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECEF",
    gap: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  menuAvatarImage: {
    width: 28,
    height: 28,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A2B3C",
  },
  profileRole: {
    fontSize: 12,
    color: "#6B7D8F",
    marginTop: 2,
  },
  menuBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  menuList: {
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  menuFooter: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FEF2F2",
  },
  logoutText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  menuFooterText: {
    fontSize: 11,
    color: "#9AA8B5",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
  },
  menuItemActive: {
    backgroundColor: "#4195BA",
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7D8F",
  },
  menuItemLabelActive: {
    color: "#FFFFFF",
  },
});

export default SidebarMenu;
