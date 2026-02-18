import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SchoolTheme } from "../theme/types";

type Props = {
  onLogin: (login: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
  theme: SchoolTheme;
  isThemeLoading?: boolean;
};

const LoginScreen = ({ onLogin, isLoading, error, theme, isThemeLoading = false }: Props) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const loginRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const canSubmit = login.trim().length > 0 && password.trim().length > 0 && !isLoading;
  const squares = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const FormWrapper = View;

  type CardProps = {
    children: React.ReactNode;
    style?: object;
  };

  const AuthCard = ({ children, style }: CardProps) => {
    return <View style={[styles.cardBase, style]}>{children}</View>;
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.8],
  });

  const androidContent = (
    <View style={styles.container}>
      <View style={styles.plainBackground} />
      <View style={styles.content}>
        <Image
          source={theme.logo_url ? { uri: theme.logo_url } : require("../../../assets/shekinah-logo.png")}
          style={[styles.logo, { alignSelf: "center" }]}
          resizeMode="contain"
        />
        <Text style={[styles.schoolName, { textAlign: "center" }]}>
          {theme.short_name || theme.name}
        </Text>
        <Text style={[styles.subtitle, { textAlign: "center", marginBottom: 16 }]}>
          {isThemeLoading ? "Loading theme..." : "Please login to your account"}
        </Text>

        <Text style={styles.label}>Username or Email</Text>
        <TextInput
          ref={loginRef}
          placeholder="Enter your username or email"
          placeholderTextColor="#94A3B8"
          value={login}
          onChangeText={(text) => {
            setLogin(text);
            if (Platform.OS === "android") {
              loginRef.current?.focus();
            }
          }}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordField}>
          <TextInput
            ref={passwordRef}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (Platform.OS === "android") {
                passwordRef.current?.focus();
              }
            }}
            secureTextEntry={!showPassword}
            style={[styles.input, styles.inputWithIcon]}
            returnKeyType="go"
            blurOnSubmit={false}
            onSubmitEditing={() => onLogin(login.trim(), password)}
          />
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          onPress={() => onLogin(login.trim(), password)}
          disabled={!canSubmit}
        >
          <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Login"}</Text>
        </Pressable>
      </View>
    </View>
  );

  const iosContent = (
    <>
      <View style={styles.plainBackground} />
      <FormWrapper style={styles.content}>
        <AuthCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Image
              source={
                theme.logo_url
                  ? { uri: theme.logo_url }
                  : require("../../../assets/shekinah-logo.png")
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.schoolName}>{theme.short_name || theme.name}</Text>
            <Text style={styles.subtitle}>
              {isThemeLoading ? "Loading theme..." : "Please login to your account"}
            </Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              ref={loginRef}
              placeholder="Enter your username or email"
              placeholderTextColor="#94A3B8"
              value={login}
              onChangeText={(text) => {
                setLogin(text);
                if (Platform.OS === "android") {
                  loginRef.current?.focus();
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                ref={passwordRef}
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (Platform.OS === "android") {
                    passwordRef.current?.focus();
                  }
                }}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.inputWithIcon]}
                returnKeyType="go"
                blurOnSubmit={false}
                onSubmitEditing={() => onLogin(login.trim(), password)}
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
              </Pressable>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={() => onLogin(login.trim(), password)}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>{isLoading ? "Signing in..." : "Login"}</Text>
            </Pressable>
          </View>
        </AuthCard>
      </FormWrapper>
    </>
  );

  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior="padding" enabled>
        {iosContent}
      </KeyboardAvoidingView>
    );
  }

  // On Android, render a minimal layout with no scroll or layout shifts.
  return androidContent;
};

const createStyles = (theme: SchoolTheme) => {
  const ctaColor =
    typeof (theme.meta as any)?.cta === "string" ? (theme.meta as any).cta : theme.colors.primary;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    plainBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#FFFFFF",
    },
    content: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
    },
    cardBase: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      shadowColor: "#0A2342",
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    card: {
      borderRadius: 28,
      padding: 0,
    },
    cardHeader: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    logo: {
      width: 72,
      height: 72,
      marginBottom: 12,
    },
    schoolName: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.primary,
      marginBottom: 6,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: "#6B7280",
      textAlign: "center",
    },
    cardBody: {
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 6,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 12,
      backgroundColor: "#F7F8FA",
      color: theme.colors.text,
    },
    passwordField: {
      position: "relative",
      justifyContent: "center",
    },
    inputWithIcon: {
      paddingRight: 40,
    },
    iconButton: {
      position: "absolute",
      right: 12,
      top: "50%",
      height: 20,
      width: 20,
      alignItems: "center",
      justifyContent: "center",
      transform: [{ translateY: -15 }],
    },
    button: {
      marginTop: 8,
      backgroundColor: ctaColor,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
    },
    buttonDisabled: {
      backgroundColor: "#93A9C1",
    },
    buttonText: {
      color: theme.colors.surface,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    errorText: {
      color: "#DC2626",
      marginBottom: 8,
    },
  });
};

export default LoginScreen;
