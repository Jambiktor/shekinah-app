import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RoleGate from "./src/navigation/RoleGate";
import ThemeProvider from "./src/shared/theme/ThemeProvider";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RoleGate />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
