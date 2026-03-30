const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://wedding-planner-api-z0l3.onrender.com";

class ApiError extends Error {
  status: number;
  data: Record<string, unknown> | null;

  constructor(message: string, status: number, data: Record<string, unknown> | null = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: { skipAuth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!options.skipAuth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — redirect to login
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    window.location.href = "/login";
    throw new ApiError("Unauthorized", 401);
  }

  let data: T | null = null;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    data = await res.json();
  }

  if (!res.ok) {
    const errorData = data as Record<string, unknown> | null;
    const message =
      (errorData?.detail as string) ||
      (errorData?.message as string) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, errorData);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: { skipAuth?: boolean }) =>
    request<T>("GET", path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: { skipAuth?: boolean }) =>
    request<T>("POST", path, body, options),

  put: <T>(path: string, body?: unknown, options?: { skipAuth?: boolean }) =>
    request<T>("PUT", path, body, options),

  delete: <T>(path: string, options?: { skipAuth?: boolean }) =>
    request<T>("DELETE", path, undefined, options),
};

export { ApiError };
