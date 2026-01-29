import { LogEntry } from "../types";

export const LOGS: LogEntry[] = [
  {
    id: "l1",
    childId: "child-1",
    childName: "Ava D.",
    logType: "IN",
    dateLogged: "2024-12-18T08:05:00",
    location: "Main Gate",
  },
  {
    id: "l2",
    childId: "child-1",
    childName: "Ava D.",
    logType: "OUT",
    dateLogged: "2024-12-17T15:35:00",
    location: "Main Gate",
  },
  {
    id: "l3",
    childId: "child-2",
    childName: "Lucas D.",
    logType: "IN",
    dateLogged: "2024-12-17T08:12:00",
    location: "North Entrance",
  },
  {
    id: "l4",
    childId: "child-2",
    childName: "Lucas D.",
    logType: "OUT",
    dateLogged: "2024-12-16T15:28:00",
    location: "Main Gate",
  },
];
