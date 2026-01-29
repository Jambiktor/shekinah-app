import React from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DeveloperClockScreen from "../features/teacher/screens/DeveloperClockScreen";

type Props = {
  onLogout: () => void;
};

const DeveloperStack = ({ onLogout }: Props) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <DeveloperClockScreen onLogout={onLogout} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
});

export default DeveloperStack;