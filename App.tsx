import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";

import RoleGate from "./src/navigation/RoleGate";
import ThemeProvider from "./src/shared/theme/ThemeProvider";
import { getEnvString } from "./src/shared/config/env";
import { fetchSchoolTheme, getDefaultTheme } from "./src/shared/theme/service";
import { SchoolTheme } from "./src/shared/theme/types";
import { setAccessToken, setSessionCookie } from "./src/shared/api/client";
import { loadAuthSession, StoredAuthSession } from "./src/shared/storage/authSession";

type ExpoUpdatesLikeModule = {
  isEnabled?: boolean;
  checkForUpdateAsync?: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync?: () => Promise<{ isNew?: boolean } | unknown>;
  reloadAsync?: () => Promise<void>;
};

const updatesModule = requireOptionalNativeModule<ExpoUpdatesLikeModule>("ExpoUpdates");
let hasPromptedUpdateThisSession = false;
const MIN_BOOT_DURATION_MS = 2000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const preloadLocalImages = async () => {
  const imageUris = [
    require("./assets/holy-nazarene.jpeg"),
    require("./assets/notification-icon.png"),
    require("./assets/icon.png"),
    require("./assets/splash.png"),
  ]
    .map((source) => Image.resolveAssetSource(source)?.uri)
    .filter((uri): uri is string => Boolean(uri));

  await Promise.allSettled(imageUris.map((uri) => Image.prefetch(uri)));
};

const preloadAssets = async () => {
  await Promise.all([
    preloadLocalImages(),
    Font.loadAsync(Ionicons.font),
  ]);
};

const warmStartupTheme = async (): Promise<SchoolTheme | null> => {
  const school = getEnvString("EXPO_PUBLIC_SCHOOL_SLUG").trim() || undefined;
  const themeResults = await Promise.allSettled([
    fetchSchoolTheme({ school, module: "app" }),
    fetchSchoolTheme({ school }),
    fetchSchoolTheme({ school, module: "admin" }),
  ]);

  const fulfilledThemes = themeResults
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<SchoolTheme> => result.status === "fulfilled"
    )
    .map((result) => result.value);

  const logoUrls = Array.from(
    new Set(
      fulfilledThemes
        .map((theme) => String(theme.logo_url ?? "").trim())
        .filter(Boolean)
    )
  );
  await Promise.allSettled(logoUrls.map((url) => Image.prefetch(url)));

  return fulfilledThemes[0] ?? null;
};

const StartupPreloader = ({
  theme,
  progress,
}: {
  theme: SchoolTheme;
  progress: Animated.Value;
}) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const pulseProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(pulseProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseProgress]);

  const logoScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const logoOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const taglineOpacity = progress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0, 0.45, 1],
  });
  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.35],
  });
  const pulseOpacity = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.26, 0],
  });

  return (
    <View style={styles.preloaderRoot}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <View style={styles.preloaderContent}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          <Image source={require("./assets/holy-nazarene.jpeg")} style={styles.preloaderLogo} />
        </Animated.View>
        <Text style={styles.preloaderTitle}>Holy Nazarene</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Animated.Text style={[styles.preloaderTagline, { opacity: taglineOpacity }]}>
          Powered by Eunika Academe
        </Animated.Text>
      </View>
    </View>
  );
};

export default function App() {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [bootTheme, setBootTheme] = useState<SchoolTheme>(getDefaultTheme());
  const [bootSession, setBootSession] = useState<StoredAuthSession | null | undefined>(undefined);
  const bootAnimationProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bootAnimationProgress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [bootAnimationProgress]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapApp = async () => {
      const minimumBootTask = delay(MIN_BOOT_DURATION_MS);

      try {
        const [assetsResult, themeResult, sessionResult] = await Promise.allSettled([
          preloadAssets(),
          warmStartupTheme(),
          loadAuthSession(),
        ]);

        if (assetsResult.status === "rejected") {
          console.warn("startup asset preload failed", assetsResult.reason);
        }

        if (isMounted) {
          if (themeResult.status === "fulfilled" && themeResult.value) {
            setBootTheme(themeResult.value);
          } else if (themeResult.status === "rejected") {
            console.warn("startup theme warmup failed", themeResult.reason);
          }

          if (sessionResult.status === "fulfilled") {
            const session = sessionResult.value ?? null;
            setBootSession(session);
            setSessionCookie(session?.sessionCookie ?? null);
            setAccessToken(session?.accessToken ?? null);
          } else {
            console.warn("startup session restore failed", sessionResult.reason);
            setBootSession(null);
            setSessionCookie(null);
            setAccessToken(null);
          }
        }
      } catch (error) {
        console.warn("startup bootstrap failed", error);
        if (isMounted) {
          setBootSession(null);
          setSessionCookie(null);
          setAccessToken(null);
        }
      } finally {
        await minimumBootTask;
        if (isMounted) {
          setIsBootstrapped(true);
        }
      }
    };

    void bootstrapApp();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkUpdatesOncePerSession = async () => {
      if (__DEV__) {
        return;
      }
      if (!updatesModule?.isEnabled) {
        return;
      }
      if (hasPromptedUpdateThisSession) {
        return;
      }
      if (!updatesModule.checkForUpdateAsync || !updatesModule.fetchUpdateAsync) {
        return;
      }

      try {
        const update = await updatesModule.checkForUpdateAsync();
        if (!isMounted || !update?.isAvailable) {
          return;
        }

        const fetched = await updatesModule.fetchUpdateAsync();
        const didFetchNew =
          typeof fetched === "object" &&
          fetched !== null &&
          "isNew" in fetched
            ? Boolean((fetched as { isNew?: boolean }).isNew)
            : true;
        if (!didFetchNew) {
          return;
        }

        if (!isMounted || hasPromptedUpdateThisSession) {
          return;
        }

        hasPromptedUpdateThisSession = true;
        Alert.alert(
          "Update ready",
          "A new update was downloaded. Restart now to apply it?",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Restart",
              onPress: () => {
                if (updatesModule.reloadAsync) {
                  void updatesModule.reloadAsync();
                }
              },
            },
          ]
        );
      } catch (error) {
        console.warn("update check failed", error);
      }
    };

    void checkUpdatesOncePerSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isBootstrapped) {
    return (
      <SafeAreaProvider>
        <StartupPreloader theme={bootTheme} progress={bootAnimationProgress} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialTheme={bootTheme}>
        <RoleGate initialSession={bootSession} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (theme: SchoolTheme) =>
  StyleSheet.create({
    preloaderRoot: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },
    backgroundGlowTop: {
      position: "absolute",
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: `${theme.colors.primary}1F`,
      top: -120,
      right: -90,
    },
    backgroundGlowBottom: {
      position: "absolute",
      width: 380,
      height: 380,
      borderRadius: 190,
      backgroundColor: `${theme.colors.secondary}14`,
      bottom: -160,
      left: -120,
    },
    preloaderContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
    },
    preloaderLogo: {
      width: 92,
      height: 92,
      borderRadius: 18,
    },
    preloaderTitle: {
      color: "#0F172A",
      fontSize: 20,
      fontWeight: "700",
    },
    pulseRing: {
      position: "absolute",
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: `${theme.colors.primary}2E`,
    },
    preloaderTagline: {
      marginTop: 2,
      color: "#475569",
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
  });
