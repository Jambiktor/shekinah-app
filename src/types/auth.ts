export type UserRole = "parent" | "teacher" | "developer";

export type AuthProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
};