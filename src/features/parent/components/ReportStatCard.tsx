import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  label: string;
  value: number;
};

const ReportStatCard = ({ label, value }: Props) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1E293B",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
});

export default ReportStatCard;
