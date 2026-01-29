import { Notification } from "../types";

export const NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    subject: "Student Attendance Notification",
    email: "parent@example.com",
    status: "sent",
    readStatus: "unread",
    datetimeSend: "2024-12-18T08:12:00",
    emailMessage:
      "<p><strong>Good morning!</strong> Your child <strong>Ava D.</strong> entered the campus at <strong>08:05 AM</strong>.</p>",
  },
  {
    id: "2",
    subject: "Student Attendance Notification",
    email: "parent@example.com",
    status: "sent",
    readStatus: "read",
    datetimeSend: "2024-12-17T15:47:00",
    emailMessage:
      "<p>Your child <strong>Ava D.</strong> exited the campus at <strong>03:35 PM</strong>.</p>",
  },
  {
    id: "3",
    subject: "Student Attendance Notification",
    email: "parent@example.com",
    status: "sent",
    readStatus: "read",
    datetimeSend: "2024-12-16T08:14:00",
    emailMessage:
      "<p>Your child <strong>Ava D.</strong> entered the campus at <strong>08:03 AM</strong>.</p>",
  },
  {
    id: "4",
    subject: "Student Attendance Notification",
    email: "parent@example.com",
    status: "sent",
    readStatus: "read",
    datetimeSend: "2024-12-15T15:44:00",
    emailMessage:
      "<p>Your child <strong>Lucas D.</strong> exited the campus at <strong>03:31 PM</strong>.</p>",
  },
];
