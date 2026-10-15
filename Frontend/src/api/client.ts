const TOKEN_KEY = "yatzar_auth_token";

function getApiBase(): string {
  const directUrl = import.meta.env.VITE_API_URL;
  if (directUrl) {
    const normalized = directUrl.replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location) {
      if (window.location.hostname === "localhost" && normalized.includes("127.0.0.1")) {
        return normalized.replace("127.0.0.1", "localhost");
      }
      if (window.location.hostname === "127.0.0.1" && normalized.includes("localhost")) {
        return normalized.replace("localhost", "127.0.0.1");
      }
    }
    return normalized;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/api/v1`;
  }

  return `http://${window.location.hostname}:8000/api/v1`;
}

export const API_BASE = getApiBase();

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in private browsing/sandboxed contexts.
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ApiError = {
  detail?: string | { msg: string }[];
  message?: string;
};

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const body = (await response.json()) as ApiEnvelope<T> | ApiError;

  if (!response.ok) {
    if (response.status === 401) {
      setAuthToken(null);
    }

    const detail = "detail" in body ? body.detail : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => item.msg).join("; ")
          : "message" in body && body.message
            ? body.message
            : `Request failed (${response.status})`;

    throw new Error(message);
  }

  if (!("success" in body) || !body.success) {
    throw new Error(
      "message" in body && body.message
        ? body.message
        : "The server returned an invalid response.",
    );
  }

  return body.data;
}
