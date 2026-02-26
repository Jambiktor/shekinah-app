import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";

import RoleGate from "./src/navigation/RoleGate";
import ThemeProvider from "./src/shared/theme/ThemeProvider";
import { getEnvString } from "./src/shared/config/env";
import { fetchSchoolTheme, getDefaultTheme } from "./src/shared/theme/service";
import { SchoolTheme } from "./src/shared/theme/types";

type ExpoUpdatesLikeModule = {
  isEnabled?: boolean;
  checkForUpdateAsync?: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync?: () => Promise<{ isNew?: boolean } | unknown>;
  reloadAsync?: () => Promise<void>;
};

const updatesModule = requireOptionalNativeModule<ExpoUpdatesLikeModule>("ExpoUpdates");
let hasPromptedUpdateThisSession = false;
const STARTUP_TIMEOUT_MS = 12000;

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

const StartupPreloader = ({ theme }: { theme: SchoolTheme }) => {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.preloaderRoot}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <View style={styles.preloaderContent}>
        <Image source={require("./assets/holy-nazarene.jpeg")} style={styles.preloaderLogo} />
        <Text style={styles.preloaderTitle}>Holy Nazarene</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </View>
  );
};

export default function App() {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [bootTheme, setBootTheme] = useState<SchoolTheme>(getDefaultTheme());

  useEffect(() => {
    let isMounted = true;

    const bootstrapApp = async () => {
      const prepare = async () => {
        const [, warmedTheme] = await Promise.allSettled([
          preloadAssets(),
          warmStartupTheme(),
        ]);
        if (
          isMounted &&
          warmedTheme.status === "fulfilled" &&
          warmedTheme.value
        ) {
          setBootTheme(warmedTheme.value);
        }
      };

      try {
        await Promise.race([prepare(), delay(STARTUP_TIMEOUT_MS)]);
      } catch (error) {
        console.warn("startup bootstrap failed", error);
      } finally {
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
        <StartupPreloader theme={bootTheme} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialTheme={bootTheme}>
        <RoleGate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (theme: SchoolTheme) =>
  StyleSheet.create({
    preloaderRoot: {
      flex: 1,
      backgroundColor: "transparent",
    },
    backgroundGlowTop: {
      position: "absolute",
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: `${theme.colors.primary}33`,
      top: -120,
      right: -90,
    },
    backgroundGlowBottom: {
      position: "absolute",
      width: 380,
      height: 380,
      borderRadius: 190,
      backgroundColor: `${theme.colors.secondary}26`,
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
  });
