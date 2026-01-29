import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { io, Socket } from "socket.io-client";

import AppHeader from "../features/teacher/components/AppHeader";
import SidebarMenu from "../features/teacher/components/SidebarMenu";
import LandingScreen, { Tab } from "../features/teacher/screens/LandingScreen";
import { fetchTeacherDashboard } from "../features/teacher/api/teacher/dashboard";
import { createEmptyReportStats } from "../shared/helpers/reports";
import {
  LogEntry,
  Notification,
  TeacherLevel,
  TeacherProfile,
  ReportStats,
  TeacherStudent,
} from "../features/teacher/types";
import { fetchTeacherStudents } from "../features/teacher/api/teacher/students";
import { flushAttendanceQueue } from "../features/teacher/api/teacher/attendance";
import { markEmailRead, registerPushToken, unregisterPushToken } from "../features/teacher/api/teacher/notifications";
import { clearRosterCache } from "../features/teacher/storage/offlineCache";
import { getEnvString } from "../shared/config/env";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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


const MENU_WIDTH = 280;
const MENU_ANIMATION_DURATION = 240;
type AvailabilityStatus = "Available" | "Busy" | "Offline";

type Props = {
  profile: TeacherProfile;
  teacherLevels: TeacherLevel[];
  loginEventId: number;
  onLogout: () => void;
};

const TeacherStack = ({ profile, teacherLevels: initialTeacherLevels, loginEventId, onLogout }: Props) => {
  const teacherProfile = profile;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats>(createEmptyReportStats());
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStudentsLoading, setIsStudentsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOfflineNotice, setShowOfflineNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("classes");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const menuProgress = useRef(new Animated.Value(0)).current;
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [availability, setAvailability] = useState<AvailabilityStatus>("Available");
  const availabilityRef = useRef<AvailabilityStatus>("Available");
  const autoBusyRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceSocketRef = useRef<Socket | null>(null);
  const [teacherLevels, setTeacherLevels] = useState<TeacherLevel[]>(initialTeacherLevels ?? []);
  const [teacherStudents, setTeacherStudents] = useState<TeacherStudent[]>([]);
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const socketUrl = getEnvString("EXPO_PUBLIC_SOCKET_IO_URL");
  const idleTimeoutMs = React.useMemo(() => {
    const parsed = Number.parseInt(getEnvString("EXPO_PUBLIC_PRESENCE_IDLE_MS"), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 180000;
  }, []);

  useEffect(() => {
    setTeacherLevels(initialTeacherLevels ?? []);
  }, [initialTeacherLevels]);

  const sectionOptions = React.useMemo(() => {
    const sections = new Set<string>();
    teacherStudents.forEach((student) => {
      const section = student.assignedSection.trim();
      if (section) {
        sections.add(section);
      }
    });
    return Array.from(sections).map((section) => ({
      label: section,
      value: section,
    }));
  }, [teacherStudents]);

  const tabTitleMap: Record<Tab, string> = {
    classes: "Classes",
    sectionDetails: "Section Details",
    inbox: "Inbox",
    attendance: "Attendance",
    announcements: "Announcements",
    excuseLetters: "Messages",
    message: "Message",
  };
  const appTitle = tabTitleMap[activeTab];
  const gradeOptions = [
    { label: "All Grades", value: "all" },
    ...(teacherLevels.length > 0
      ? teacherLevels.map((level) => ({
          label: `${level.levelName} - ${level.section}`,
          value: `${level.levelName} - ${level.section}`,
        }))
      : sectionOptions.length > 0
      ? sectionOptions
      : []),
  ];

  useEffect(() => {
    if (activeTab !== "message") {
      setActiveEmailId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    availabilityRef.current = availability;
  }, [availability]);

  const scheduleIdleTimeout = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      if (availabilityRef.current === "Offline") {
        return;
      }
      if (availabilityRef.current === "Busy") {
        return;
      }
      autoBusyRef.current = true;
      setAvailability("Busy");
    }, idleTimeoutMs);
  }, [idleTimeoutMs]);

  const markPresenceActivity = useCallback(() => {
    scheduleIdleTimeout();
    if (availabilityRef.current === "Busy" && autoBusyRef.current) {
      autoBusyRef.current = false;
      setAvailability("Available");
    }
  }, [scheduleIdleTimeout]);

  const handleAvailabilityChange = useCallback((next: AvailabilityStatus) => {
    autoBusyRef.current = false;
    setAvailability(next);
  }, []);

  const handleLogout = () => {
    // console.log("handleLogout", { scope: "teacher" });
    unregisterPushToken().catch(() => undefined);
    setNotifications([]);
    setLogs([]);
    setReportStats(createEmptyReportStats());
    setActiveTab("classes");
    setSelectedClass(null);
    setIsMenuOpen(false);
    setIsMenuVisible(false);
    menuProgress.setValue(0);
    setSelectedGrade("all");
    setTeacherLevels([]);
    setActiveEmailId(null);
    onLogout();
  };

  const handleSelectEmail = (emailId: string) => {
    setActiveEmailId(emailId);
    const wasUnread =
      notifications.find((email) => email.id === emailId)?.readStatus === "unread";
    if (!wasUnread) {
      return;
    }

    setNotifications((prev) =>
      prev.map((email) =>
        email.id === emailId ? { ...email, readStatus: "read" } : email
      )
    );

    markEmailRead(emailId).then((response) => {
      if (response.success) {
        return;
      }
      const message = response.message?.toLowerCase() ?? "";
      if (message.includes("unauthorized")) {
        return;
      }
      setNotifications((prev) =>
        prev.map((email) =>
          email.id === emailId ? { ...email, readStatus: "unread" } : email
        )
      );
    });
  };

  const isUnauthorizedError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes("unauthorized");
  };

  const loadDashboard = useCallback(async () => {
    if (!teacherProfile) {
      return;
    }

    setIsDashboardLoading(true);
    try {
      // console.log("loadDashboard:start", {
      //   scope: "teacher",
      //   profileId: teacherProfile.id,
      // });
      const response = await fetchTeacherDashboard();
      // console.log("loadDashboard:success", {
      //   scope: "teacher",
      //   notificationsCount: response.notifications?.length ?? 0,
      //   logsCount: response.logs?.length ?? 0,
      //   reportsChildrenCount: response.reports?.children?.length ?? 0,
      // });
      setNotifications(response.notifications);
      setLogs(response.logs);
      setReportStats(response.reports);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // console.log("loadDashboard:failed", { scope: "teacher", message });
      if (isUnauthorizedError(error)) {
        handleLogout();
        return;
      }
      const fallback = createEmptyReportStats();
      setNotifications([]);
      setLogs([]);
      setReportStats(fallback);
    } finally {
      setIsDashboardLoading(false);
    }
  }, [teacherProfile]);

  const loadStudents = useCallback(async () => {
    if (!teacherProfile) {
      return;
    }

    try {
      setIsStudentsLoading(true);
      const students = await fetchTeacherStudents(teacherProfile.id);
      setTeacherStudents(students);
    } catch (error) {
      setTeacherStudents([]);
    } finally {
      setIsStudentsLoading(false);
    }
  }, [teacherProfile]);

  const handleRefresh = async () => {
    if (!teacherProfile) {
      return;
    }

    setIsRefreshing(true);
    try {
      setIsSyncing(true);
      await clearRosterCache(teacherProfile.id);
      await Promise.all([loadDashboard(), loadStudents(), flushAttendanceQueue()]);
    } finally {
      setIsSyncing(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!teacherProfile) {
      return;
    }
    loadDashboard();
    loadStudents();
  }, [loadDashboard, loadStudents, teacherProfile]);

  useEffect(() => {
    if (!teacherProfile || loginEventId <= 0) {
      return;
    }
    const registerPush = async () => {
      try {
        const { token, error: tokenError } = await registerForPushNotificationsAsync();
        if (token) {
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
  }, [loginEventId, teacherProfile]);

  useEffect(() => {
    if (!teacherProfile) {
      return;
    }
    markPresenceActivity();
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [markPresenceActivity, teacherProfile]);

  useEffect(() => {
    if (!teacherProfile || !socketUrl) {
      return;
    }

    const socket = io(socketUrl, { transports: ["websocket"] });
    presenceSocketRef.current = socket;

    const emitPresence = (type: "presence:join" | "presence:update" | "presence:leave") => {
      socket.emit(type, {
        teacherId: teacherProfile.id,
        status: availabilityRef.current,
        timestamp: new Date().toISOString(),
      });
    };

    socket.on("connect", () => {
      emitPresence("presence:join");
    });

    return () => {
      if (socket.connected) {
        emitPresence("presence:leave");
      }
      socket.disconnect();
      if (presenceSocketRef.current === socket) {
        presenceSocketRef.current = null;
      }
    };
  }, [teacherProfile, socketUrl]);

  useEffect(() => {
    const socket = presenceSocketRef.current;
    if (!teacherProfile || !socket || !socket.connected) {
      return;
    }
    socket.emit("presence:update", {
      teacherId: teacherProfile.id,
      status: availability,
      timestamp: new Date().toISOString(),
    });
  }, [availability, teacherProfile]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
      setShowOfflineNotice(false);
      return;
    }

    setShowOfflineNotice(true);
    const timer = setTimeout(() => {
      setShowOfflineNotice(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isOnline]);

  useEffect(() => {
    if (!teacherProfile) {
      return;
    }

    let isActive = true;
    const interval = setInterval(() => {
      if (!isActive) {
        return;
      }
      setIsSyncing(true);
      flushAttendanceQueue()
        .catch(() => undefined)
        .finally(() => {
          if (isActive) {
            setIsSyncing(false);
          }
        });
    }, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [teacherProfile]);

  const handleOpenMenu = useCallback(() => {
    if (isMenuVisible || isMenuOpen) {
      return;
    }
    setIsMenuVisible(true);
    setIsMenuOpen(true);
    Animated.timing(menuProgress, {
      toValue: 1,
      duration: MENU_ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [MENU_ANIMATION_DURATION, isMenuOpen, isMenuVisible, menuProgress]);

  const handleCloseMenu = useCallback(() => {
    if (!isMenuVisible) {
      setIsMenuOpen(false);
      return;
    }
    setIsMenuOpen(false);
    Animated.timing(menuProgress, {
      toValue: 0,
      duration: MENU_ANIMATION_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsMenuVisible(false);
      }
    });
  }, [MENU_ANIMATION_DURATION, isMenuVisible, menuProgress]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const handleBackPress = () => {
      if (isMenuOpen) {
        handleCloseMenu();
        return true;
      }

      if (activeTab === "message") {
        setActiveTab("inbox");
        return true;
      }

      if (activeTab !== "classes") {
        setActiveTab("classes");
        setSelectedClass(null);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => subscription.remove();
  }, [activeTab, handleCloseMenu, isMenuOpen]);

  if (!teacherProfile) {
    return null;
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      onTouchStart={markPresenceActivity}
      onTouchMove={markPresenceActivity}
    >
      <AppHeader
        title={appTitle}
        onMenuPress={handleOpenMenu}
        showNotificationIcon
        notificationCount={notifications.filter((email) => email.readStatus === "unread").length}
        availability={availability}
        onAvailabilityChange={handleAvailabilityChange}
        onNotificationPress={() => {
          setActiveEmailId(null);
          setActiveTab("inbox");
        }}
      />
      {showOfflineNotice ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      ) : null}
      
      <LandingScreen
        profileName={teacherProfile?.name ?? "Teacher"}
        teacherId={teacherProfile?.id ?? ""}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedClass={selectedClass}
        onClassSelect={setSelectedClass}
        gradeFilter={selectedGrade}
        gradeOptions={gradeOptions}
        onGradeChange={setSelectedGrade}
        students={teacherStudents}
        notifications={notifications}
        activeEmailId={activeEmailId}
        onSelectEmail={handleSelectEmail}
        studentsLoading={isStudentsLoading}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        isInboxLoading={isDashboardLoading}
      />

        {isMenuVisible ? (
          <SidebarMenu
            isVisible={isMenuVisible}
            menuProgress={menuProgress}
            menuWidth={MENU_WIDTH}
            activeTab={activeTab}
            profileName={teacherProfile?.name ?? "Teacher"}
            onClose={handleCloseMenu}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              handleCloseMenu();
            }}
            onLogout={handleLogout}
          />
        ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  offlineBanner: {
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 6,
    textAlign: "center",
  },
  offlineText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});

export default TeacherStack;
