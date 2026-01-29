import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import NetInfo from "@react-native-community/netinfo";
import NfcManager, { Ndef, NfcEvents } from "react-native-nfc-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSessionCookie } from "../../../shared/api/client";
import { getEnvString } from "../../../shared/config/env";

const ATTENDANCE_QUEUE_KEY = "attendance_queue_v1";

type AttendanceQueueItem = {
  cardUrl: string | null;
  cardNumber: string | null;
  logType: "IN" | "OUT";
  tappedAt: string;
  queuedAt: string;
};

const buildNumbers = (center: number, radius: number) =>
  Array.from({ length: 12 }, (_, index) => {
    const num = index + 1;
    const angle = (num / 12) * Math.PI * 2 - Math.PI / 2;
    return {
      num,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

const getClockHands = (date: Date) => {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const hourAngle = hours * 30 + minutes * 0.5 + seconds * (0.5 / 60);
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;
  return { hourAngle, minuteAngle, secondAngle };
};

const extractCardNumberFromText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get("id");
    if (id) {
      return id;
    }
  } catch {
    // Not a URL, continue with raw string.
  }

  const match = trimmed.match(/[?&]id=([^&]+)/i);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  return trimmed;
};

const extractCardNumberFromTag = (tag: any) => {
  if (!tag) {
    return null;
  }

  const records = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
  for (const record of records) {
    if (!record?.payload) {
      continue;
    }

    let decoded: string | null = null;
    try {
      decoded = Ndef.text.decodePayload(record.payload);
    } catch {
      // Not a text record.
    }
    if (!decoded) {
      try {
        decoded = Ndef.uri.decodePayload(record.payload);
      } catch {
        // Not a URI record.
      }
    }

    if (decoded) {
      const cardNumber = extractCardNumberFromText(decoded);
      if (cardNumber) {
        return cardNumber;
      }
    }
  }

  const rawId = tag.id ?? tag.identifier;
  if (typeof rawId === "string") {
    return rawId;
  }
  if (Array.isArray(rawId)) {
    return rawId.map((byte) => Number(byte).toString(16).padStart(2, "0")).join("");
  }

  return null;
};

const extractUrlFromTag = (tag: any) => {
  if (!tag) {
    return null;
  }

  const records = Array.isArray(tag.ndefMessage) ? tag.ndefMessage : [];
  for (const record of records) {
    if (!record?.payload) {
      continue;
    }

    let decoded: string | null = null;
    try {
      decoded = Ndef.text.decodePayload(record.payload);
    } catch {
      // Not a text record.
    }
    if (!decoded) {
      try {
        decoded = Ndef.uri.decodePayload(record.payload);
      } catch {
        // Not a URI record.
      }
    }

    if (decoded && /^https?:/i.test(decoded)) {
      return decoded.trim();
    }
  }

  return null;
};

const getDisplayCardNumber = (cardUrl: string | null, cardNumber: string | null) => {
  if (cardUrl) {
    try {
      const parsed = new URL(cardUrl);
      return parsed.searchParams.get("id") || cardNumber || "";
    } catch {
      const match = cardUrl.match(/[?&]id=([^&]+)/i);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
  }
  return cardNumber || "";
};

const buildCardUrlFromNumber = (cardNumber: string) => {
  const baseUrl = getEnvString("EXPO_PUBLIC_API_BASE_URL");
  if (!baseUrl) {
    return null;
  }

  try {
    const origin = new URL(baseUrl).origin;
    return `${origin}/?id=${encodeURIComponent(cardNumber)}`;
  } catch {
    return null;
  }
};

type Props = {
  onLogout: () => void;
};

const DeveloperClockScreen = ({ onLogout }: Props) => {
  const { width } = useWindowDimensions();
  const scale = Math.min(width / 375, 1.15);
  const cardWidth = Math.min(width - 32, 420);
  const clockSize = Math.min(cardWidth * 0.7, 260);
  const center = clockSize / 2;
  const numberRadius = clockSize * 0.38;
  const numberOffset = Math.max(6, 8 * scale);
  const borderWidth = Math.max(6, clockSize * 0.04);
  const handWidth = Math.max(4, clockSize * 0.025);
  const secondHandWidth = Math.max(2, handWidth * 0.4);
  const centerDotSize = Math.max(10, clockSize * 0.06);
  const timeFontSize = Math.max(18, 22 * scale);
  const dayFontSize = Math.max(13, 15 * scale);
  const dateFontSize = Math.max(12, 13 * scale);
  const statusFontSize = Math.max(12, 13 * scale);
  const nfcFontSize = Math.max(11, 12 * scale);
  const numbers = useMemo(() => buildNumbers(center, numberRadius), [center, numberRadius]);

  const [now, setNow] = useState(() => new Date());
  const [logType, setLogType] = useState<"IN" | "OUT">("IN");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isNfcReady, setIsNfcReady] = useState(false);
  const isFlushingQueue = useRef(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timer = setTimeout(() => setStatusMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected);
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  const getAttendanceQueue = useCallback(async (): Promise<AttendanceQueueItem[]> => {
    try {
      const raw = await AsyncStorage.getItem(ATTENDANCE_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as AttendanceQueueItem[]) : [];
    } catch {
      return [];
    }
  }, []);

  const setAttendanceQueue = useCallback(async (queue: AttendanceQueueItem[]) => {
    try {
      await AsyncStorage.setItem(ATTENDANCE_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // Ignore queue write errors.
    }
  }, []);

  const enqueueAttendance = useCallback(
    async (item: AttendanceQueueItem) => {
      const queue = await getAttendanceQueue();
      queue.push(item);
      await setAttendanceQueue(queue);
    },
    [getAttendanceQueue, setAttendanceQueue]
  );

  const sendAttendanceOnline = useCallback(
    async (item: AttendanceQueueItem) => {
      // console.log("Attendance payload:", item);
      const baseUrl = getEnvString("EXPO_PUBLIC_API_BASE_URL");
      if (!baseUrl) {
        throw new Error("EXPO_PUBLIC_API_BASE_URL is not set.");
      }

      const url = `${baseUrl.replace(/\/$/, "")}/record_attendance`;
      const params = new URLSearchParams();
      if (item.cardUrl) {
        params.append("card_url", item.cardUrl);
      }
      if (item.cardNumber) {
        params.append("card_number", item.cardNumber);
      }
      params.append("log_type", item.logType);
      params.append("client_time", item.tappedAt);

      const cookie = getSessionCookie();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: params.toString(),
      });

      const raw = await response.text().catch(() => "");
      let payload: any = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }
      // console.log("Attendance response status:", response.status);
      // console.log("Attendance response raw:", raw || "<empty>");
      // console.log("Attendance response:", payload);
      if (!response.ok || !payload?.success) {
        const message =
          payload?.message || "Failed to record attendance.";
        throw new Error(message);
      }

      return payload;
    },
    []
  );

  const flushAttendanceQueue = useCallback(async () => {
    if (isFlushingQueue.current || !isOnline) {
      return;
    }
    isFlushingQueue.current = true;
    try {
      let queue = await getAttendanceQueue();
      let syncedCount = 0;
      while (queue.length > 0) {
        const item = queue[0];
        try {
          await sendAttendanceOnline(item);
          queue.shift();
          syncedCount += 1;
          await setAttendanceQueue(queue);
        } catch {
          break;
        }
      }
      if (syncedCount > 0) {
        setStatusMessage(`Synced ${syncedCount} attendance`);
      }
    } finally {
      isFlushingQueue.current = false;
    }
  }, [getAttendanceQueue, isOnline, sendAttendanceOnline, setAttendanceQueue]);

  useEffect(() => {
    if (isOnline) {
      flushAttendanceQueue();
    }
  }, [flushAttendanceQueue, isOnline]);

  const handleAttendance = useCallback(
    async (cardUrl: string | null, cardNumber: string | null) => {
      const effectiveCardNumber = cardNumber || getDisplayCardNumber(cardUrl, cardNumber);
      const effectiveCardUrl = cardUrl || (effectiveCardNumber ? buildCardUrlFromNumber(effectiveCardNumber) : null);
      if (!effectiveCardUrl) {
        setStatusMessage("Missing card URL");
        return;
      }

      const payload: AttendanceQueueItem = {
        cardUrl: effectiveCardUrl,
        cardNumber: null,
        logType,
        tappedAt: new Date().toISOString(),
        queuedAt: new Date().toISOString(),
      };

      if (!isOnline) {
        await enqueueAttendance(payload);
      const displayCard = getDisplayCardNumber(cardUrl, cardNumber) || "N/A";
      setStatusMessage(`Queued offline (${logType}) - Card ${displayCard}`);
        return;
      }

      try {
        await sendAttendanceOnline(payload);
        const displayCard = getDisplayCardNumber(cardUrl, cardNumber) || "N/A";
        setStatusMessage(`Recorded ${logType} - Card ${displayCard}`);
      } catch (error) {
        await enqueueAttendance(payload);
        const message = error instanceof Error ? error.message : "Network error.";
        setStatusMessage(message);
      }
    },
    [enqueueAttendance, isOnline, logType, sendAttendanceOnline]
  );

  useEffect(() => {
    let isActive = true;
    const startNfc = async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!supported || !isActive) {
          setIsNfcReady(false);
          return;
        }

        const enabled = await NfcManager.isEnabled();
        if (!enabled || !isActive) {
          setIsNfcReady(false);
          return;
        }

        await NfcManager.start();
        NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag) => {
          if (!isActive) {
            return;
          }
          const cardUrl = extractUrlFromTag(tag);
          const cardNumber = extractCardNumberFromTag(tag);
          handleAttendance(cardUrl, cardNumber);
        });
        await NfcManager.registerTagEvent();
        if (isActive) {
          setIsNfcReady(true);
        }
      } catch {
        if (isActive) {
          setIsNfcReady(false);
        }
      }
    };

    startNfc();

    return () => {
      isActive = false;
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.unregisterTagEvent().catch(() => undefined);
      setIsNfcReady(false);
    };
  }, [handleAttendance]);

  const { hourAngle, minuteAngle, secondAngle } = getClockHands(now);
  const timeString = now
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .toUpperCase();
  const dayString = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateString = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isUnregistered = statusMessage?.includes("Unregistered card") ?? false;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1E6FB6", "#2F7CC0", "#5E9FCA"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          styles.card,
          {
            width: cardWidth,
            paddingVertical: Math.max(22, 32 * scale),
            paddingHorizontal: Math.max(18, 24 * scale),
          },
        ]}
      >
        <View
          style={[
            styles.clockFace,
            {
              width: clockSize,
              height: clockSize,
              borderRadius: clockSize / 2,
              borderWidth,
              marginBottom: Math.max(16, 24 * scale),
            },
          ]}
        >
          {numbers.map((item) => (
            <Text
              key={`num-${item.num}`}
              style={[
                styles.clockNumber,
                {
                  left: item.x - numberOffset,
                  top: item.y - numberOffset,
                  fontSize: Math.max(10, 12 * scale),
                },
              ]}
            >
              {item.num}
            </Text>
          ))}
          <View style={[styles.handWrap, { transform: [{ rotate: `${hourAngle}deg` }] }]}>
            <View
              style={[
                styles.hand,
                styles.hourHand,
                {
                  height: clockSize * 0.26,
                  top: -(clockSize * 0.26),
                  width: handWidth,
                  left: -handWidth / 2,
                  borderRadius: handWidth,
                },
              ]}
            />
          </View>
          <View style={[styles.handWrap, { transform: [{ rotate: `${minuteAngle}deg` }] }]}>
            <View
              style={[
                styles.hand,
                styles.minuteHand,
                {
                  height: clockSize * 0.38,
                  top: -(clockSize * 0.38),
                  width: handWidth,
                  left: -handWidth / 2,
                  borderRadius: handWidth,
                },
              ]}
            />
          </View>
          <View style={[styles.handWrap, { transform: [{ rotate: `${secondAngle}deg` }] }]}>
            <View
              style={[
                styles.hand,
                styles.secondHand,
                {
                  height: clockSize * 0.44,
                  top: -(clockSize * 0.44),
                  width: secondHandWidth,
                  left: -secondHandWidth / 2,
                  borderRadius: secondHandWidth,
                },
              ]}
            />
          </View>
          <View
            style={[
              styles.centerDot,
              {
                width: centerDotSize,
                height: centerDotSize,
                borderRadius: centerDotSize / 2,
              },
            ]}
          />
        </View>
        <Text style={[styles.timeText, { fontSize: timeFontSize }]}>{timeString}</Text>
        <Text style={[styles.dayText, { fontSize: dayFontSize }]}>{dayString}</Text>
        <Text style={[styles.dateText, { fontSize: dateFontSize }]}>{dateString}</Text>
        {!isUnregistered ? (
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { fontSize: statusFontSize }]}>Current Status:</Text>
            <Text style={[styles.statusValue, { fontSize: statusFontSize }]}>{logType}</Text>
          </View>
        ) : null}
        {!isUnregistered ? (
          <Pressable
            style={[styles.toggleButton, logType === "IN" && styles.toggleButtonActive]}
            onPress={() => setLogType((prev) => (prev === "IN" ? "OUT" : "IN"))}
          >
            <View style={[styles.toggleKnob, logType === "IN" ? styles.knobLeft : styles.knobRight]} />
            <Text style={styles.toggleText}>{logType}</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.nfcStatusText, { fontSize: nfcFontSize }]}>
          {isNfcReady ? "NFC ready - tap card" : "NFC unavailable"}
        </Text>
        {statusMessage ? (
          <Text style={[styles.statusMessage, { fontSize: nfcFontSize }]}>
            {statusMessage}
          </Text>
        ) : null}
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#F6FAFD",
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#0A2342",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  clockFace: {
    backgroundColor: "#FFFFFF",
    borderColor: "#1E6FB6",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clockNumber: {
    position: "absolute",
    color: "#1E6FB6",
    fontWeight: "700",
  },
  handWrap: {
    position: "absolute",
    width: 0,
    height: 0,
    left: "50%",
    top: "50%",
  },
  hand: {
    position: "absolute",
    backgroundColor: "#1E3A5F",
  },
  hourHand: {},
  minuteHand: {
    backgroundColor: "#1E6FB6",
  },
  secondHand: {
    backgroundColor: "#1E6FB6",
  },
  centerDot: {
    backgroundColor: "#1E6FB6",
  },
  timeText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#1E3A5F",
    marginBottom: 8,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F7CC0",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  statusLabel: {
    fontSize: 13,
    color: "#1E3A5F",
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A5F",
  },
  toggleButton: {
    marginTop: 12,
    width: 140,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#CBD5E1",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#2F7CC0",
  },
  toggleKnob: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    top: 1,
    shadowColor: "#0A2342",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  knobLeft: {
    left: 2,
  },
  knobRight: {
    right: 2,
  },
  toggleText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.6,
  },
  nfcStatusText: {
    marginTop: 12,
    fontSize: 12,
    color: "#2F7CC0",
    fontWeight: "600",
  },
  statusMessage: {
    marginTop: 8,
    fontSize: 12,
    color: "#1E3A5F",
    textAlign: "center",
  },
  logoutButton: {
    marginTop: 20,
    paddingHorizontal: 26,
    paddingVertical: 10,
    backgroundColor: "#0E63BB",
    borderRadius: 20,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.3,
  },
});

export default DeveloperClockScreen;
