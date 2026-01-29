import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Platform, SafeAreaView, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";

import AppHeader from "../features/parent/components/AppHeader";
import AppDrawer from "../features/parent/components/AppDrawer";
import DashboardScreen from "../features/parent/screens/DashboardScreen";
import InboxScreen from "../features/parent/screens/InboxScreen";
import LogsScreen from "../features/parent/screens/LogsScreen";
import MessageScreen from "../features/parent/screens/MessageScreen";
import SettingsScreen from "../features/parent/screens/SettingsScreen";
import DirectMessageScreen from "../features/parent/screens/DirectMessageScreen";
import { fetchParentDashboard } from "../features/parent/api/parent/dashboard";
import { updatePassword } from "../features/parent/api/parent/account";
import {
  markEmailRead,
  fetchEmailNotificationsPreference,
  registerPushToken,
  unregisterPushToken,
  updateEmailNotifications,
} from "../features/parent/api/parent/notifications";
import { createEmptyReportStats } from "../shared/helpers/reports";
import { Child, LogEntry, Notification, ParentProfile, ReportStats, ScreenKey } from "../features/parent/types";
import {
  clearEmailNotificationPreference,
  loadEmailNotificationPreference,
  saveEmailNotificationPreference,
} from "../features/parent/storage/preferences";
import { getEnvString } from "../shared/config/env";

const MENU_ITEMS = [
  { key: "dashboard" as const, label: "Dashboard", icon: "home-outline" },
  { key: "inbox" as const, label: "Inbox", icon: "mail-outline" },
  { key: "logs" as const, label: "View Attendance", icon: "clipboard-outline" },
  { key: "excuse-letter" as const, label: "Talk to Teacher", icon: "chatbubble-ellipses-outline" },
  { key: "settings" as const, label: "Settings", icon: "settings-outline" },
];

const registerForPushNotificationsAsync = async (): Promise<{
  token: string | null;
  projectId?: string;
  error?: string;
}> => {
  if (!Device.isDevice) {
    return { token: null, error: "Push notifications require a physical device." };
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (finalStatus !== "granted") {
      const request = await Notifications.requestPermissionsAsync();
      finalStatus = request.status;
    }

    if (finalStatus !== "granted") {
      return { token: null, error: "Notification permission not granted." };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? undefined;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return { token: token.data, projectId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { token: null, error: message };
  }
};


type Props = {
  profile: ParentProfile;
  loginEventId: number;
  onLogout: () => void;
};

const ParentStack = ({ profile, loginEventId, onLogout }: Props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("dashboard");
  const parentProfile = profile;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats>(createEmptyReportStats());
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState("all");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isInboxRefreshing, setIsInboxRefreshing] = useState(false);
  const [testNotificationDelaySeconds, setTestNotificationDelaySeconds] = useState("0");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushProjectId, setPushProjectId] = useState<string | null>(null);
  const [pendingEmailId, setPendingEmailId] = useState<string | null>(null);
  const [directMessagePrefill, setDirectMessagePrefill] = useState<{
    childIds: string[];
    teacherIds: string[];
  } | null>(null);
  const [teacherPresence, setTeacherPresence] = useState<
    Record<string, { status: string; timestamp: string }>
  >({});
  const presenceSocketRef = useRef<Socket | null>(null);
  const socketUrl = getEnvString("EXPO_PUBLIC_SOCKET_IO_URL");
  const screenAnim = useRef(new Animated.Value(1)).current;

  const activeEmail = useMemo(
    () => notifications.find((email) => email.id === activeEmailId) ?? null,
    [notifications, activeEmailId]
  );

  const childOptions = useMemo(() => {
    if (children.length > 0) {
      const options = children.map((child) => ({ id: child.id, label: child.name }));
      return [{ id: "all", label: "All Children" }, ...options];
    }

    const fallbackOptions = Array.from(
      new Map(logs.map((log) => [log.childId, log.childName])).entries()
    ).map(([id, label]) => ({ id, label }));

    return [{ id: "all", label: "All Children" }, ...fallbackOptions];
  }, [children, logs]);

  const selectedChildName =
    childOptions.find((child) => child.id === selectedChildId)?.label ??
    (children[0]?.name ?? "Your Child");

  const filteredLogs = useMemo(() => {
    if (selectedChildId === "all") {
      return logs;
    }
    return logs.filter((log) => log.childId === selectedChildId);
  }, [selectedChildId, logs]);

  const appTitle = "Shekinah Learning School";

  const isUnauthorizedError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes("unauthorized");
  };

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: Boolean(parentProfile),
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }, [parentProfile]);

  useEffect(() => {
    if (activeScreen !== "message") {
      setActiveEmailId(null);
    }
  }, [activeScreen]);

  useEffect(() => {
    screenAnim.setValue(0);
    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeScreen, screenAnim]);

  const openScreen = (screen: ScreenKey) => {
    setActiveScreen(screen);
    setMenuOpen(false);
  };

  const handleOpenDirectMessage = (childIds: string[], teacherIds: string[]) => {
    if (childIds.length > 0) {
      setSelectedChildId(childIds[0]);
    }
    setDirectMessagePrefill({ childIds, teacherIds });
    setActiveScreen("excuse-letter");
  };

  const handleLogout = () => {
    console.log("handleLogout", { scope: "parent" });
    setMenuOpen(false);
    setActiveScreen("dashboard");
    setActiveEmailId(null);
    setNotifications([]);
    setLogs([]);
    setChildren([]);
    setReportStats(createEmptyReportStats());
    setPendingEmailId(null);
    setPushToken(null);
    setPushProjectId(null);
    unregisterPushToken().catch(() => undefined);
    Notifications.dismissAllNotificationsAsync().catch(() => undefined);
    Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    void clearEmailNotificationPreference();
    onLogout();
  };

  const handleSelectEmail = async (emailId: string) => {
    setActiveEmailId(emailId);
    setActiveScreen("message");
    const wasUnread = notifications.find((email) => email.id === emailId)?.readStatus === "unread";
    if (!wasUnread) {
      return;
    }

    setNotifications((prev) =>
      prev.map((email) => (email.id === emailId ? { ...email, readStatus: "read" } : email))
    );

    try {
      const response = await markEmailRead(emailId);
      if (!response.success) {
        throw new Error(response.message || "Failed to mark email as read.");
      }
    } catch (error) {
      console.warn("markEmailRead failed", error);
      setNotifications((prev) =>
        prev.map((email) => (email.id === emailId ? { ...email, readStatus: "unread" } : email))
      );
    }
  };

  const handleNotificationOpen = (response: Notifications.NotificationResponse) => {
    if (!parentProfile) {
      return;
    }
    const data = response.notification.request.content.data ?? {};
    const rawEmailId =
      (data as { email_id?: string | number; emailId?: string | number }).email_id ??
      (data as { email_id?: string | number; emailId?: string | number }).emailId ??
      "";
    const emailId = rawEmailId !== null && rawEmailId !== undefined ? String(rawEmailId) : "";
    if (emailId) {
      setPendingEmailId(emailId);
      setActiveScreen("inbox");
      return;
    }
    setActiveEmailId(null);
    setActiveScreen("inbox");
  };

  const handleToggleEmailNotifications = async (value: boolean) => {
    const previousValue = emailNotifications;
    setEmailNotifications(value);
    try {
      const response = await updateEmailNotifications(value);
      if (!response.success) {
        throw new Error(response.message || "Unable to update email preferences.");
      }
      if (parentProfile) {
        await saveEmailNotificationPreference(parentProfile.id, value);
      }
    } catch (error) {
      console.warn("updateEmailNotifications failed", error);
      setEmailNotifications(previousValue);
    }
  };

  const syncEmailNotificationPreference = async (userId: string) => {
    try {
      const response = await fetchEmailNotificationsPreference();
      if (response.success && typeof response.enabled === "boolean") {
        setEmailNotifications(response.enabled);
        await saveEmailNotificationPreference(userId, response.enabled);
        return;
      }
    } catch (error) {
      console.warn("fetchEmailNotificationsPreference failed", error);
    }

    const storedPreference = await loadEmailNotificationPreference(userId);
    if (storedPreference !== null) {
      setEmailNotifications(storedPreference);
    }
  };

  useEffect(() => {
    if (!parentProfile) {
      return;
    }
    void syncEmailNotificationPreference(parentProfile.id);
  }, [parentProfile]);

  useEffect(() => {
    if (!parentProfile || loginEventId <= 0) {
      return;
    }
    const registerPush = async () => {
      try {
        const { token, error: tokenError, projectId } = await registerForPushNotificationsAsync();
        if (token) {
          setPushToken(token);
          setPushProjectId(projectId ?? null);
          const registerResponse = await registerPushToken(token);
          if (!registerResponse.success) {
            console.warn("registerPushToken failed", registerResponse.message);
          }
        } else if (tokenError) {
          console.warn("push token unavailable", tokenError);
        }
      } catch (error) {
        console.warn("registerPushToken after login failed", error);
      }
    };
    void registerPush();
  }, [loginEventId, parentProfile]);

  const handleUpdatePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    const response = await updatePassword(currentPassword, newPassword, confirmPassword);
    if (!response.success) {
      throw new Error(response.message || "Failed to update password.");
    }
    return response;
  };

  const handleSimulateNotification = async () => {
    try {
      const parsedDelay = Number.parseInt(testNotificationDelaySeconds, 10);
      const delaySeconds = Number.isFinite(parsedDelay) && parsedDelay > 0 ? parsedDelay : 0;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (finalStatus !== "granted") {
        const request = await Notifications.requestPermissionsAsync();
        finalStatus = request.status;
      }

      if (finalStatus !== "granted") {
        console.warn("notification permission not granted");
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Shekinah Parent",
          body: "Test notification from the drawer.",
          data: { source: "drawer-test" },
        },
        trigger:
          delaySeconds > 0
            ? {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: delaySeconds,
              }
            : null,
      });
    } catch (error) {
      console.warn("simulate notification failed", error);
    }
  };

  const handleShowPushToken = () => {
    if (!pushToken) {
      console.warn("push token unavailable");
      return;
    }
    console.log("push token", { projectId: pushProjectId ?? "N/A", token: pushToken });
  };

  const loadDashboard = async (options?: { keepSelection?: boolean }) => {
    if (!parentProfile) {
      return;
    }

    setIsDashboardLoading(true);
    try {
      const response = await fetchParentDashboard();
      setNotifications(response.notifications);
      setLogs(response.logs);
      setChildren(response.children);
      setReportStats(response.reports);
      if (!options?.keepSelection) {
        setSelectedChildId("all");
        setActiveEmailId(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log("loadDashboard failed", { scope: "parent", message });
      if (isUnauthorizedError(error)) {
        handleLogout();
        return;
      }
      const fallback = createEmptyReportStats();
      setNotifications([]);
      setLogs([]);
      setChildren([]);
      setReportStats(fallback);
      if (!options?.keepSelection) {
        setSelectedChildId("all");
        setActiveEmailId(null);
      }
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [parentProfile]);

  useEffect(() => {
    if (!parentProfile) {
      return;
    }
    if (!socketUrl) {
      return;
    }

    const socket = io(socketUrl, { transports: ["websocket"] });
    presenceSocketRef.current = socket;

    socket.on("presence:updated", (payload) => {
      const teacherIdRaw = payload?.teacherId;
      if (teacherIdRaw === null || teacherIdRaw === undefined || teacherIdRaw === "") {
        return;
      }
      const teacherId = String(teacherIdRaw);
      const status = typeof payload?.status === "string" ? payload.status : "Offline";
      const timestamp =
        typeof payload?.timestamp === "string" ? payload.timestamp : new Date().toISOString();
      setTeacherPresence((prev) => ({
        ...prev,
        [teacherId]: { status, timestamp },
      }));
    });
    socket.on("presence:snapshot", (payload) => {
      const snapshot = payload?.snapshot;
      if (!snapshot || typeof snapshot !== "object") {
        return;
      }
      setTeacherPresence((prev) => ({
        ...prev,
        ...snapshot,
      }));
    });

    return () => {
      socket.disconnect();
      if (presenceSocketRef.current === socket) {
        presenceSocketRef.current = null;
      }
    };
  }, [parentProfile, socketUrl]);

  useEffect(() => {
    let isMounted = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) {
        return;
      }
      handleNotificationOpen(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationOpen(response);
    });
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingEmailId || !parentProfile) {
      return;
    }
    if (isDashboardLoading) {
      return;
    }
    const emailExists = notifications.some((email) => email.id === pendingEmailId);
    if (!emailExists) {
      loadDashboard({ keepSelection: true });
      return;
    }
    void handleSelectEmail(pendingEmailId);
    setPendingEmailId(null);
  }, [pendingEmailId, parentProfile, notifications, isDashboardLoading]);

  const previousScreenRef = useRef<ScreenKey>(activeScreen);

  useEffect(() => {
    const previousScreen = previousScreenRef.current;
    previousScreenRef.current = activeScreen;
    if (activeScreen !== "inbox" || previousScreen === "inbox") {
      return;
    }
    if (!parentProfile || isDashboardLoading || isInboxRefreshing) {
      return;
    }
    loadDashboard({ keepSelection: true });
  }, [activeScreen, parentProfile, isDashboardLoading, isInboxRefreshing]);

  // Push token registration is handled during login to avoid duplicate alerts.

  useEffect(() => {
    const handleBackPress = () => {
      if (menuOpen) {
        setMenuOpen(false);
        return true;
      }

      if (activeScreen !== "dashboard") {
        setActiveScreen("dashboard");
        setActiveEmailId(null);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => subscription.remove();
  }, [activeScreen, menuOpen]);

  if (!parentProfile) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <AppHeader
        title={appTitle}
        onMenuPress={() => setMenuOpen((prev) => !prev)}
        showNotificationIcon
        notificationCount={
          notifications.filter((email) => email.readStatus === "unread").length
        }
        onNotificationPress={() => {
          setActiveEmailId(null);
          setActiveScreen("inbox");
        }}
      />

      <AppDrawer
        isOpen={menuOpen}
        menuItems={MENU_ITEMS}
        activeKey={activeScreen}
        onSelect={openScreen}
        onClose={() => setMenuOpen(false)}
        onLogout={handleLogout}
        onSimulateNotification={handleSimulateNotification}
        onShowPushToken={handleShowPushToken}
        testNotificationDelaySeconds={testNotificationDelaySeconds}
        onChangeTestNotificationDelay={setTestNotificationDelaySeconds}
        profileName={parentProfile?.name ?? "Parent"}
        profileRole={
          parentProfile?.role
            ? parentProfile.role.charAt(0).toUpperCase() + parentProfile.role.slice(1)
            : "Parent"
        }
        profileId={parentProfile?.id ?? "N/A"}
        childOptions={childOptions}
        selectedChildId={selectedChildId}
        onSelectChild={setSelectedChildId}
      />

      <Animated.View
        style={[
          styles.screenContainer,
          {
            opacity: screenAnim,
            transform: [
              {
                translateY: screenAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {activeScreen === "inbox" && (
          <InboxScreen
            emails={notifications}
            activeEmailId={activeEmailId}
            onSelectEmail={(emailId) => void handleSelectEmail(emailId)}
            isLoading={isDashboardLoading}
            isRefreshing={isInboxRefreshing}
            onRefresh={async () => {
              setIsInboxRefreshing(true);
              await loadDashboard({ keepSelection: true });
              setIsInboxRefreshing(false);
            }}
          />
        )}

        {activeScreen === "dashboard" && (
          <DashboardScreen
            stats={reportStats}
            notifications={notifications}
            logs={logs}
            activeEmailId={activeEmailId}
            onSelectEmail={(emailId) => void handleSelectEmail(emailId)}
            isLoading={isDashboardLoading}
            onOpenDirectMessage={handleOpenDirectMessage}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            teacherPresence={teacherPresence}
          />
        )}

        {activeScreen === "message" && (
          <MessageScreen email={activeEmail} onBack={() => openScreen("inbox")} />
        )}

        {activeScreen === "logs" && (
          <LogsScreen
            logs={filteredLogs}
            childOptions={childOptions}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            isLoading={isDashboardLoading}
          />
        )}

        {activeScreen === "excuse-letter" && (
          <DirectMessageScreen
            selectedChildId={selectedChildId}
            childOptions={childOptions}
            selectedChildName={selectedChildName}
            initialSelectedChildIds={directMessagePrefill?.childIds}
            initialSelectedTeacherIds={directMessagePrefill?.teacherIds}
            onPrefillApplied={() => setDirectMessagePrefill(null)}
            teacherPresence={teacherPresence}
          />
        )}

        {activeScreen === "settings" && (
          <SettingsScreen
            emailNotifications={emailNotifications}
            onToggleEmailNotifications={(value) => void handleToggleEmailNotifications(value)}
            onUpdatePassword={handleUpdatePassword}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  backgroundGlowTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(31, 176, 242, 0.18)",
    top: -120,
    right: -90,
  },
  backgroundGlowBottom: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(26, 115, 232, 0.12)",
    bottom: -160,
    left: -120,
  },
  screenContainer: {
    flex: 1,
  },
});

export default ParentStack;
