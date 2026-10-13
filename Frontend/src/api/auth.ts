import { getAuthToken, request, setAuthToken } from "@/api/client";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  employee_name: string | null;
  display_name: string | null;
  role: string;
  photo: string | null;
  token?: string | null;
};

export async function loginRequest(identifier: string, password: string) {
  const user = await request<AuthUser>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
  if (user.token) {
    setAuthToken(user.token);
  }
  return user;
}

export async function getCurrentUser() {
  const user = await request<AuthUser>("/auth/me");
  if (user.token) {
    setAuthToken(user.token);
  }
  return user;
}

export async function logoutRequest() {
  try {
    return await request<null>("/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

export { getAuthToken, setAuthToken } from "@/api/client";
