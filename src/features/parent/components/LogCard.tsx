import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { formatLogTimestamp } from "../../../shared/helpers/date";
import { LogEntry } from "../types";

type Props = {
  log: LogEntry;
};

const LogCard = ({ log }: Props) => {
  const isIn = log.logType === "IN";
  const isAbsent = log.logType === "ABSENT";
  const iconName = isIn ? "log-in-outline" : isAbsent ? "close-circle-outline" : "log-out-outline";
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            isIn ? styles.iconWrapIn : isAbsent ? styles.iconWrapAbsent : styles.iconWrapOut,
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isIn ? "#1F6FEB" : isAbsent ? "#DC2626" : "#DC2626"}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.child} numberOfLines={1}>
            {log.childName}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatLogTimestamp(log.dateLogged)}
          </Text>
        </View>
        <View
          style={[
            styles.status,
            isIn ? styles.statusIn : isAbsent ? styles.statusAbsent : styles.statusOut,
          ]}
        >
          <Text style={styles.statusText}>{log.logType}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapIn: {
    backgroundColor: "#E7F0FF",
  },
  iconWrapOut: {
    backgroundColor: "#FEE2E2",
  },
  iconWrapAbsent: {
    backgroundColor: "#FEE2E2",
  },
  textWrap: {
    flex: 1,
  },
  child: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1B2B",
    lineHeight: 20,
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusIn: {
    backgroundColor: "#DBEAFE",
  },
  statusOut: {
    backgroundColor: "#FEE2E2",
  },
  statusAbsent: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  meta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
  },
});

export default LogCard;
