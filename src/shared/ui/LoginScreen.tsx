import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  onLogin: (login: string, password: string) => void;
  isLoading: boolean;
  error: string | null;
};

type CardProps = {
  children: React.ReactNode;
  style?: object;
};

const AuthCard = ({ children, style }: CardProps) => {
  return <View style={[styles.cardBase, style]}>{children}</View>;
};

const LoginScreen = ({ onLogin, isLoading, error }: Props) => {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const canSubmit = login.trim().length > 0 && password.trim().length > 0 && !isLoading;
  const squares = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);

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

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const content = (
    <>
      <LinearGradient
        colors={["#1E6FB6", "#2F7CC0", "#5E9FCA"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.authBg}>
        <View style={styles.floatingGrid}>
          {squares.map((index) => {
            const direction = index % 2 === 0 ? 1 : -1;
            return (
              <Animated.View
                key={`square-${index}`}
                style={[
                  styles.floatingSquare,
                  { transform: [{ translateY: Animated.multiply(floatTranslate, direction) }] },
                ]}
              />
            );
          })}
        </View>
        <Animated.View
          style={[
            styles.glowDot,
            styles.glowDotOne,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.glowDot,
            styles.glowDotTwo,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.glowDot,
            styles.glowDotThree,
            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
          ]}
        />
        <View style={styles.frameOutline} />
        <View style={styles.frameOutlineSmall} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Image
              source={require("../../../assets/shekinah-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.schoolName}>Shekinah Learning School</Text>
            <Text style={styles.subtitle}>Please login to your account</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.label}>Username or Email</Text>
            <TextInput
              placeholder="Enter your username or email"
              placeholderTextColor="#94A3B8"
              value={login}
              onChangeText={setLogin}
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.inputWithIcon]}
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
      </ScrollView>
    </>
  );

  const keyboardBehavior = Platform.OS === "ios" ? "padding" : "height";
  const keyboardEnabled = Platform.OS === "ios" ? true : keyboardVisible;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={keyboardBehavior}
      enabled={keyboardEnabled}
    >
      {content}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  authBg: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingGrid: {
    position: "absolute",
    top: 64,
    right: 14,
    width: 64 * 3 + 18 * 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    opacity: 0.35,
  },
  floatingSquare: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  glowDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  glowDotOne: {
    left: "18%",
    top: "24%",
  },
  glowDotTwo: {
    right: "26%",
    top: "38%",
  },
  glowDotThree: {
    right: "20%",
    bottom: "22%",
  },
  frameOutline: {
    position: "absolute",
    left: "6%",
    top: "18%",
    width: 280,
    height: 420,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ rotate: "-12deg" }],
    opacity: 0.5,
  },
  frameOutlineSmall: {
    position: "absolute",
    right: "12%",
    bottom: "18%",
    width: 180,
    height: 180,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    transform: [{ rotate: "-12deg" }],
    opacity: 0.35,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  cardBase: {
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#EEF2F7",
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2E7DBF",
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
    color: "#1F2937",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E9EF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#F7F8FA",
    color: "#0F172A",
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
    backgroundColor: "#0E63BB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#93A9C1",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  errorText: {
    color: "#DC2626",
    marginBottom: 8,
  },
});

export default LoginScreen;