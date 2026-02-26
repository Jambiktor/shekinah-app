import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Card from "../components/Card";
import { useTheme } from "../../../shared/theme/ThemeProvider";

type Props = {
  emailNotifications: boolean;
  onToggleEmailNotifications: (value: boolean) => void;
  onUpdatePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
};

const SettingsScreen = ({
  emailNotifications,
  onToggleEmailNotifications,
  onUpdatePassword,
}: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const canSubmit = useMemo(() => {
    if (isUpdating) {
      return false;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return false;
    }

    if (newPassword.trim().length < 6) {
      return false;
    }

    return newPassword.trim() === confirmPassword.trim();
  }, [confirmPassword, currentPassword, isUpdating, newPassword]);

  const handleUpdatePassword = async () => {
    if (!canSubmit) {
      setStatusTone("error");
      if (newPassword.trim().length < 6) {
        setStatusMessage("New password must be at least 6 characters.");
      } else if (newPassword.trim() !== confirmPassword.trim()) {
        setStatusMessage("Passwords do not match.");
      } else {
        setStatusMessage("Please fill out all password fields.");
      }
      return;
    }

    setIsUpdating(true);
    setStatusMessage(null);
    setStatusTone(null);
    try {
      const response = await onUpdatePassword(
        currentPassword.trim(),
        newPassword.trim(),
        confirmPassword.trim()
      );
      setStatusTone("success");
      setStatusMessage(response.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update password.";
      setStatusTone("error");
      setStatusMessage(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const content = (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.pageTitle}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        <Text style={styles.sectionBody}>
          Decide whether you would like to receive attendance updates by email.
        </Text>
        <Card style={styles.preferenceCard}>
          <View style={styles.preferenceHeader}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.preferenceText}>
              <Text style={styles.preferenceTitle}>Email notifications</Text>
              <Text style={styles.preferenceBody}>
                Turning this off will stop all attendance emails. You can change this anytime.
              </Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={onToggleEmailNotifications}
              trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}66` }}
              thumbColor={emailNotifications ? theme.colors.primary : theme.colors.surface}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Password</Text>
        <Card style={styles.passwordCard}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Enter current password"
              placeholderTextColor={`${theme.colors.text}99`}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              style={styles.input}
            />
            <Pressable
              style={styles.inputIcon}
              onPress={() => setShowCurrentPassword((value) => !value)}
            >
              <Ionicons
                name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.colors.text}
              />
            </Pressable>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor={`${theme.colors.text}99`}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              style={styles.input}
            />
            <Pressable
              style={styles.inputIcon}
              onPress={() => setShowNewPassword((value) => !value)}
            >
              <Ionicons
                name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.colors.text}
              />
            </Pressable>
          </View>
          <Text style={styles.helperText}>At least 6 characters.</Text>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor={`${theme.colors.text}99`}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
            />
            <Pressable
              style={styles.inputIcon}
              onPress={() => setShowConfirmPassword((value) => !value)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.colors.text}
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.updateButton, !canSubmit && styles.updateButtonDisabled]}
            onPress={handleUpdatePassword}
            disabled={!canSubmit}
          >
            <Ionicons name="lock-closed-outline" size={16} color={theme.colors.surface} />
            <Text style={styles.updateButtonText}>
              {isUpdating ? "Updating..." : "Update Password"}
            </Text>
          </Pressable>
          {statusMessage ? (
            <Text style={[styles.statusText, statusTone === "success" && styles.statusSuccess]}>
              {statusMessage}
            </Text>
          ) : null}
        </Card>
      </View>
    </ScrollView>
  );

  return Platform.OS === "ios" ? (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      {content}
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.screen}>{content}</View>
  );
};

const createStyles = (theme: import("../../../shared/theme/types").SchoolTheme) => {
  const colors = theme.colors;
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 20,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sectionBody: {
      fontSize: 13,
      color: `${colors.text}99`,
    },
    preferenceCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      shadowColor: colors.text,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    passwordCard: {
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    preferenceHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    preferenceIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${colors.primary}14`,
      alignItems: "center",
      justifyContent: "center",
    },
    preferenceText: {
      flex: 1,
      gap: 4,
    },
    preferenceTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.text,
    },
    preferenceBody: {
      fontSize: 12,
      color: `${colors.text}99`,
      lineHeight: 18,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      color: colors.text,
      paddingVertical: 6,
    },
    inputIcon: {
      paddingLeft: 8,
      paddingVertical: 4,
    },
    helperText: {
      fontSize: 12,
      color: `${colors.text}99`,
      marginTop: -6,
    },
    updateButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    updateButtonDisabled: {
      backgroundColor: colors.border,
    },
    updateButtonText: {
      color: colors.surface,
      fontWeight: "700",
    },
    statusText: {
      fontSize: 12,
      color: colors.accent,
    },
    statusSuccess: {
      color: colors.primary,
    },
  });
};

export default SettingsScreen;
