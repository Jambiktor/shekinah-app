import { apiFetch } from "../../../../shared/api/client";

type BasicResponse = {
  success: boolean;
  message?: string;
};

const buildFormBody = (entries: Array<[string, string]>) => {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => params.append(key, value));
  return params.toString();
};

export const updatePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<BasicResponse> => {
  const body = buildFormBody([
    ["current_password", currentPassword],
    ["new_password", newPassword],
    ["confirm_password", confirmPassword],
  ]);

  const response = await apiFetch<BasicResponse>("/update_password", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return response;
};
