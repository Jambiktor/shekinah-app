import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AnnouncementsScreen from "./AnnouncementsScreen";
import AttendanceScreen from "./AttendanceScreen";
import ClassesScreen from "./ClassesScreen";
import DirectMessage from "./DirectMessage";
import InboxScreen from "./InboxScreen";
import MessageScreen from "./MessageScreen";
import SectionDetailsScreen from "./SectionDetailsScreen";
import { Notification, TeacherStudent } from "../types";

export type Tab =
  | "classes"
  | "sectionDetails"
  | "attendance"
  | "announcements"
  | "excuseLetters"
  | "inbox"
  | "message";

type Props = {
  profileName: string;
  teacherId: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  selectedClass: string | null;
  onClassSelect: (classId: string) => void;
  gradeFilter: string;
  gradeOptions: { label: string; value: string }[];
  onGradeChange: (grade: string) => void;
  students: TeacherStudent[];
  notifications: Notification[];
  activeEmailId: string | null;
  onSelectEmail: (emailId: string) => void;
  studentsLoading: boolean;
  isInboxLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

// const Hero = ({ profileName }: { profileName: string }) => (
//   <LinearGradient
//     colors={["#4195BA", "#0E63BB"]}
//     start={{ x: 0, y: 0 }}
//     end={{ x: 1, y: 0 }}
//     style={styles.heroCard}
//   >
//     <Text style={styles.heroEyebrow}>Welcome back, {profileName}</Text>
//     <Text style={styles.heroTitle}>Teacher Portal</Text>
//     <Text style={styles.heroSubtitle}>
//       Fast attendance, class management, and parent communications.
//     </Text>
//   </LinearGradient>
// );

const LandingScreen = ({
  profileName,
  teacherId,
  activeTab,
  onTabChange,
  selectedClass,
  onClassSelect,
  gradeFilter,
  gradeOptions,
  onGradeChange,
  students,
  notifications,
  activeEmailId,
  onSelectEmail,
  studentsLoading,
  isInboxLoading,
  refreshing,
  onRefresh,
}: Props) => {
  const handleClassSelect = (classId: string) => {
    onClassSelect(classId);
    onTabChange("sectionDetails");
  };

  const usesVirtualizedList = activeTab === "inbox";
  const content = (
    <>
      {/* {activeTab === "classes" ? <Hero profileName={profileName} /> : null} */}
      <View style={styles.tabCard}>
        <View
          style={[
            styles.tabContent,
            activeTab === "inbox" && styles.tabContentFull,
          ]}
        >
          {activeTab === "classes" ? (
            <ClassesScreen
              onClassSelect={handleClassSelect}
              gradeFilter={gradeFilter}
              gradeOptions={gradeOptions}
              onGradeChange={onGradeChange}
              students={students}
            />
          ) : null}
          {activeTab === "attendance" ? (
            <AttendanceScreen
              selectedClass={selectedClass}
              students={students}
              teacherId={teacherId}
              isLoading={studentsLoading}
            />
          ) : null}
          {activeTab === "sectionDetails" ? (
            <SectionDetailsScreen
              selectedClass={selectedClass}
              teacherId={teacherId}
              students={students}
              onBack={() => onTabChange("classes")}
              onStartAttendance={() => onTabChange("attendance")}
            />
          ) : null}
          {activeTab === "announcements" ? (
            <AnnouncementsScreen
              gradeFilter={gradeFilter}
              gradeOptions={gradeOptions}
              onGradeChange={onGradeChange}
              students={students}
            />
          ) : null}
          {activeTab === "inbox" ? (
            <InboxScreen
              emails={notifications}
              activeEmailId={activeEmailId}
              onSelectEmail={(emailId) => {
                onSelectEmail(emailId);
                onTabChange("message");
              }}
              isLoading={isInboxLoading}
              isRefreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : null}
          {activeTab === "message" ? (
            <MessageScreen
              email={notifications.find((email) => email.id === activeEmailId) ?? null}
              onBack={() => onTabChange("inbox")}
            />
          ) : null}
          {activeTab === "excuseLetters" ? <DirectMessage /> : null}
        </View>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {usesVirtualizedList ? (
        <View style={styles.container}>{content}</View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {content}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollContainer: {
    backgroundColor: "#FAFBFC",
    flexGrow: 1,
  },
  tabCard: {
    flex: 1,
    borderRadius: 0,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  tabContentFull: {
    padding: 0,
  },
});

export default LandingScreen;
