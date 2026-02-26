import { apiFetch } from "../../../../shared/api/client";
import { getEnvString } from "../../../../shared/config/env";
import { Child, LogEntry } from "../../types";

type EventsPayloadResponse = {
  ok?: boolean;
  events?: unknown;
  count?: number;
  message?: string;
};

const PURCHASE_HINTS = [
  "purchase",
  "sale",
  "transaction",
  "order",
  "checkout",
  "payment",
  "canteen",
  "pos",
];

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toComparableId = (value: unknown): string => {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (/^\d+$/.test(text)) {
    return String(Number(text));
  }
  const prefixedNumericMatch = text.match(/^[a-zA-Z_-]+(\d+)$/);
  if (prefixedNumericMatch) {
    return String(Number(prefixedNumericMatch[1]));
  }
  return text.toLowerCase();
};

const toComparableName = (value: unknown): string => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
};

const toComparableNameTokenKey = (value: unknown): string => {
  const tokens = toComparableName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .sort();
  return tokens.join(" ");
};

const parseJsonRecord = (value: string): Record<string, unknown> | null => {
  try {
    return toRecord(JSON.parse(value));
  } catch {
    return null;
  }
};

const readField = (
  source: Record<string, unknown> | null,
  keys: string[]
): unknown => {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

const readStringField = (
  source: Record<string, unknown> | null,
  keys: string[]
): string => {
  const value = readField(source, keys);
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
};

const readNumberField = (
  source: Record<string, unknown> | null,
  keys: string[]
): number | null => {
  const value = readField(source, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (!cleaned) {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const decodePayload = (
  eventRecord: Record<string, unknown>
): Record<string, unknown> | null => {
  const rawPayload = eventRecord.payload;
  if (typeof rawPayload === "string") {
    const parsed = parseJsonRecord(rawPayload);
    if (parsed) {
      return parsed;
    }
  }

  const payloadRecord = toRecord(rawPayload);
  if (payloadRecord) {
    return payloadRecord;
  }

  const fallbackData = toRecord(eventRecord.data);
  if (fallbackData) {
    return fallbackData;
  }

  return null;
};

const resolveChild = (
  eventRecord: Record<string, unknown>,
  payloadRecord: Record<string, unknown> | null,
  childById: Map<string, Child>,
  childByName: Map<string, Child>,
  children: Child[]
): Child | null => {
  const nestedStudent =
    toRecord(readField(payloadRecord, ["student", "child", "customer", "user"])) ||
    toRecord(readField(eventRecord, ["student", "child", "customer", "user"]));

  const eventStudentIdCandidate =
    readStringField(eventRecord, ["student_id", "studentId", "child_id", "childId", "user_id"]);
  const payloadStudentIdCandidate =
    readStringField(payloadRecord, ["student_id", "studentId", "child_id", "childId", "user_id"]);
  const idCandidate =
    eventStudentIdCandidate ||
    payloadStudentIdCandidate ||
    readStringField(nestedStudent, ["id", "student_id", "child_id"]);

  const nameCandidate =
    readStringField(payloadRecord, ["child_name", "childName", "student_name", "studentName", "name"]) ||
    readStringField(eventRecord, ["child_name", "childName", "student_name", "studentName", "name"]) ||
    readStringField(nestedStudent, ["name", "student_name", "child_name"]);

  if (idCandidate) {
    const matchById = childById.get(toComparableId(idCandidate));
    if (matchById) {
      return matchById;
    }
  }

  if (nameCandidate) {
    const nameComparable = toComparableName(nameCandidate);
    const matchByName =
      childByName.get(nameComparable) ||
      childByName.get(toComparableNameTokenKey(nameCandidate));
    if (matchByName) {
      return matchByName;
    }

    const looseNameMatch = children.find((child) => {
      const childComparable = toComparableName(child.name);
      return (
        childComparable.includes(nameComparable) ||
        nameComparable.includes(childComparable)
      );
    });
    if (looseNameMatch) {
      return looseNameMatch;
    }
  }

  return null;
};

const isPurchaseEvent = (
  eventRecord: Record<string, unknown>,
  payloadRecord: Record<string, unknown> | null
): boolean => {
  const eventType =
    readStringField(eventRecord, ["event_type", "eventType", "type", "action", "name"]) ||
    readStringField(payloadRecord, ["event_type", "eventType", "type", "action", "name"]);
  const normalizedEventType = eventType.toLowerCase();
  if (PURCHASE_HINTS.some((hint) => normalizedEventType.includes(hint))) {
    return true;
  }

  const amount =
    readNumberField(payloadRecord, ["total", "total_amount", "grand_total", "amount", "subtotal"]) ??
    readNumberField(eventRecord, ["total", "total_amount", "grand_total", "amount", "subtotal"]);
  if (amount !== null) {
    return true;
  }

  const items =
    readField(payloadRecord, ["items", "line_items", "products", "cart_items"]) ??
    readField(eventRecord, ["items", "line_items", "products", "cart_items"]);
  return Array.isArray(items) && items.length > 0;
};

const toCompactNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "";
  }
  return Number.isInteger(value) ? String(value) : String(value);
};

const getPrimaryItemSummary = (
  eventRecord: Record<string, unknown>,
  payloadRecord: Record<string, unknown> | null
): string => {
  const items =
    readField(payloadRecord, ["items", "line_items", "products", "cart_items"]) ??
    readField(eventRecord, ["items", "line_items", "products", "cart_items"]);
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const first = toRecord(items[0]);
  if (!first) {
    return "";
  }

  const name = readStringField(first, ["product_name", "name", "title", "item_name"]);
  const price = readNumberField(first, ["price", "unit_price", "amount"]);
  const quantity = readNumberField(first, ["quantity", "qty", "count"]);
  const displayName = name || "Item";
  const quantityText = quantity !== null ? ` x${toCompactNumber(quantity)}` : "";
  const priceText = price !== null ? ` (${pesoFormatter.format(price)})` : "";
  return `${displayName}${quantityText}${priceText}`;
};

const getTimestamp = (
  eventRecord: Record<string, unknown>,
  payloadRecord: Record<string, unknown> | null
): string => {
  const nestedTransaction =
    toRecord(readField(payloadRecord, ["transaction"])) ||
    toRecord(readField(eventRecord, ["transaction"]));

  const rawTimestamp =
    readStringField(payloadRecord, [
      "purchased_at",
      "purchase_time",
      "transaction_time",
      "transaction_at",
      "created_at",
      "timestamp",
      "date",
    ]) ||
    readStringField(eventRecord, [
      "purchased_at",
      "purchase_time",
      "transaction_time",
      "transaction_at",
      "created_at",
      "timestamp",
      "date",
    ]) ||
    readStringField(nestedTransaction, [
      "timestamp",
      "created_at",
      "date",
      "transaction_time",
    ]);

  if (!rawTimestamp) {
    return new Date().toISOString();
  }
  const parsed = new Date(rawTimestamp);
  return Number.isNaN(parsed.getTime()) ? rawTimestamp : parsed.toISOString();
};

const buildSummary = (
  eventRecord: Record<string, unknown>,
  payloadRecord: Record<string, unknown> | null,
  _defaultKioskId: string
): string => {
  const parts: string[] = [];

  const primaryItem = getPrimaryItemSummary(eventRecord, payloadRecord);
  if (primaryItem) {
    parts.push(primaryItem);
  }

  const amount =
    readNumberField(payloadRecord, ["total", "total_amount", "grand_total", "amount", "subtotal"]) ??
    readNumberField(eventRecord, ["total", "total_amount", "grand_total", "amount", "subtotal"]);
  if (amount !== null) {
    parts.push(`Total ${pesoFormatter.format(amount)}`);
  }

  return parts.length > 0 ? parts.join(" • ") : "Purchase";
};

const toPurchaseLogEntries = (
  rawEvents: unknown[],
  children: Child[],
  defaultKioskId: string
): LogEntry[] => {
  const childById = new Map(children.map((child) => [toComparableId(child.id), child]));
  const childByName = new Map<string, Child>();
  children.forEach((child) => {
    const directKey = toComparableName(child.name);
    if (directKey && !childByName.has(directKey)) {
      childByName.set(directKey, child);
    }

    const tokenKey = toComparableNameTokenKey(child.name);
    if (tokenKey && !childByName.has(tokenKey)) {
      childByName.set(tokenKey, child);
    }
  });

  const entries: LogEntry[] = [];

  rawEvents.forEach((event, index) => {
    const eventRecord = toRecord(event);
    if (!eventRecord) {
      return;
    }

    const payloadRecord = decodePayload(eventRecord);
    if (!isPurchaseEvent(eventRecord, payloadRecord)) {
      return;
    }

    const child = resolveChild(
      eventRecord,
      payloadRecord,
      childById,
      childByName,
      children
    );
    if (!child) {
      return;
    }

    const rawEventId =
      readStringField(eventRecord, ["id", "event_id", "uuid"]) ||
      readStringField(payloadRecord, ["id", "event_id", "uuid"]) ||
      String(index + 1);

    entries.push({
      id: `purchase-${rawEventId}-${child.id}-${index}`,
      childId: child.id,
      childName: child.name,
      logType: "PURCHASE",
      dateLogged: getTimestamp(eventRecord, payloadRecord),
      location: buildSummary(eventRecord, payloadRecord, defaultKioskId),
    });
  });

  return entries.sort((a, b) => {
    const aTime = new Date(a.dateLogged).getTime();
    const bTime = new Date(b.dateLogged).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return bTime - aTime;
    }
    if (!Number.isNaN(aTime)) {
      return -1;
    }
    if (!Number.isNaN(bTime)) {
      return 1;
    }
    return b.dateLogged.localeCompare(a.dateLogged);
  });
};

export const fetchChildPurchaseLogs = async (children: Child[]): Promise<LogEntry[]> => {
  if (children.length === 0) {
    return [];
  }

  const kioskId = getEnvString("EXPO_PUBLIC_KIOSK_ID").trim();
  if (!kioskId) {
    // The endpoint requires kiosk credentials; skip when kiosk is not configured.
    return [];
  }
  const kioskApiKey = getEnvString("EXPO_PUBLIC_KIOSK_API_KEY").trim();
  const kioskEventsPath =
    getEnvString("EXPO_PUBLIC_KIOSK_EVENTS_PATH").trim() || "/kiosk/sync/events/payloads";

  const limitRaw = Number(getEnvString("EXPO_PUBLIC_KIOSK_PURCHASE_LIMIT"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 300;
  const since = getEnvString("EXPO_PUBLIC_KIOSK_PURCHASE_SINCE").trim();

  const params = new URLSearchParams();
  params.set("kiosk_id", kioskId);
  params.set("limit", String(limit));
  if (since) {
    params.set("since", since);
  }

  const response = await apiFetch<EventsPayloadResponse>(`${kioskEventsPath}?${params.toString()}`, {
    method: "GET",
    headers: {
      "X-Kiosk-Id": kioskId,
      ...(kioskApiKey ? { "X-Kiosk-Api-Key": kioskApiKey } : {}),
    },
  });

  const events = Array.isArray(response.events) ? response.events : [];
  return toPurchaseLogEntries(events, children, kioskId);
};
