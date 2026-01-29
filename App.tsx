import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import RoleGate from "./src/navigation/RoleGate";

export default function App() {
  return (
    <SafeAreaProvider>
      <RoleGate />
    </SafeAreaProvider>
  );
}