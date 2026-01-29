import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import LoginScreen from "../shared/ui/LoginScreen";
import { loginWithRole, readAuthTokens } from "../shared/auth/login";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../shared/storage/authSession";
import { setAccessToken, setSessionCookie } from "../shared/api/client";
import ParentStack from "./ParentStack";
import TeacherStack from "./TeacherStack";
import DeveloperStack from "./DeveloperStack";
import { AuthProfile } from "../types/auth";
import { ParentProfile } from "../features/parent/types";
import { TeacherLevel, TeacherProfile } from "../features/teacher/types";

const normalizeRole = (role: string | null | undefined) => {
  return String(role || "").trim().toLowerCase();
};

const normalizeTeacherLevels = (levels: unknown[] | undefined): TeacherLevel[] => {
  return Array.isArray(levels) ? (levels as TeacherLevel[]) : [];
};

const RoleGate = () => {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [teacherLevels, setTeacherLevels] = useState<TeacherLevel[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);
  const [loginEventId, setLoginEventId] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      setIsSessionRestoring(true);
      try {
        const session = await loadAuthSession();
        if (!isMounted || !session) {
          return;
        }
        setSessionCookie(session.sessionCookie ?? null);
        setAccessToken(session.accessToken ?? null);
        setProfile(session.profile);
        setTeacherLevels(normalizeTeacherLevels(session.teacherLevels));
      } finally {
        if (isMounted) {
          setIsSessionRestoring(false);
        }
      }
    };
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (login: string, password: string) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await loginWithRole(login, password);
      const tokens = readAuthTokens();
      await saveAuthSession(result.profile, tokens, result.teacherLevels);
      setProfile(result.profile);
      setTeacherLevels(normalizeTeacherLevels(result.teacherLevels));
      setLoginEventId((prev) => prev + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthSession();
    setSessionCookie(null);
    setAccessToken(null);
    setProfile(null);
    setTeacherLevels([]);
    setLoginEventId(0);
  };

  const role = useMemo(() => normalizeRole(profile?.role), [profile?.role]);

  if (!profile) {
    if (isSessionRestoring) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.backgroundGlowTop} />
          <View style={styles.backgroundGlowBottom} />
          <View style={styles.loadingContainer}>
            <Image
              source={require("../../assets/shekinah-logo.png")}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <ActivityIndicator size="large" color="#1F6FE8" />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />
        <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} error={authError} />
      </SafeAreaView>
    );
  }

  if (role === "parent") {
    return (
      <ParentStack
        profile={profile as ParentProfile}
        loginEventId={loginEventId}
        onLogout={handleLogout}
      />
    );
  }

  if (role === "teacher") {
    return (
      <TeacherStack
        profile={profile as TeacherProfile}
        teacherLevels={teacherLevels}
        loginEventId={loginEventId}
        onLogout={handleLogout}
      />
    );
  }

  if (role === "developer") {
    return <DeveloperStack onLogout={handleLogout} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <LoginScreen
        onLogin={handleLogin}
        isLoading={isAuthLoading}
        error={authError ?? "Unsupported account role."}
      />
    </SafeAreaView>
  );
};

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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
});

export default RoleGate;