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
              <Ionicons name="mail-outline" size={20} color="#1A73E8" />
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
              trackColor={{ false: "#CBD5E1", true: "#77C6F8" }}
              thumbColor={emailNotifications ? "#1A73E8" : "#F1F5F9"}
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
              placeholderTextColor="#94A3B8"
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
                color="#64748B"
              />
            </Pressable>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Enter new password"
              placeholderTextColor="#94A3B8"
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
                color="#64748B"
              />
            </Pressable>
          </View>
          <Text style={styles.helperText}>At least 6 characters.</Text>

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Confirm new password"
              placeholderTextColor="#94A3B8"
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
                color="#64748B"
              />
            </Pressable>
          </View>

          <Pressable
            style={[styles.updateButton, !canSubmit && styles.updateButtonDisabled]}
            onPress={handleUpdatePassword}
            disabled={!canSubmit}
          >
            <Ionicons name="lock-closed-outline" size={16} color="#FFFFFF" />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
    color: "#0F172A",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionBody: {
    fontSize: 13,
    color: "#64748B",
  },
  preferenceCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#0f172a6e",
    shadowOpacity: 0,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  passwordCard: {
    gap: 12,
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
    backgroundColor: "#E8F3FF",
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
    color: "#0F172A",
  },
  preferenceBody: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    color: "#0F172A",
    paddingVertical: 6,
  },
  inputIcon: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -6,
  },
  updateButton: {
    marginTop: 8,
    backgroundColor: "#3B8DBD",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  updateButtonDisabled: {
    backgroundColor: "#9DBFD3",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statusText: {
    fontSize: 12,
    color: "#B91C1C",
  },
  statusSuccess: {
    color: "#15803D",
  },
});

export default SettingsScreen;
