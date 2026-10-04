import { UIEvent } from "@/types";

export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("tradeswarm_jwt") : null;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: getAuthHeaders(),
  });
  if (response.status === 401) logout();
  if (!response.ok) {
    throw new Error(`API GET failed: ${response.statusText}`);
  }
  return response.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401) logout();
  if (!response.ok) {
    throw new Error(`API POST failed: ${response.statusText}`);
  }
  return response.json();
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(path, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (response.status === 401) logout();
  if (!response.ok) {
    throw new Error(`API DELETE failed: ${response.statusText}`);
  }
}

export async function login(password: string): Promise<string> {
  const response = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem("tradeswarm_jwt", data.access_token);
    return data.access_token;
  }
  throw new Error("No access token returned");
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tradeswarm_jwt");
    window.location.href = "/login";
  }
}

export function isAuthenticated(): boolean {
  if (typeof window !== "undefined") {
    return !!localStorage.getItem("tradeswarm_jwt");
  }
  return false;
}

export async function fetchSSE(
  path: string,
  body: any,
  onEvent: (event: UIEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
    signal,
  });

  if (response.status === 401) logout();

  if (!response.ok || !response.body) {
    throw new Error(`API SSE failed: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const dataStr = line.slice(6);
            if (dataStr.trim() === "[DONE]") continue;
            const eventData = JSON.parse(dataStr) as UIEvent;
            onEvent(eventData);
          } catch (e) {
            console.error("Failed to parse SSE event data:", line, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
