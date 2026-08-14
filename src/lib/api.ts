export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const FAILED = "فشلت العملية";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("تعذر الاتصال بالخادم", 0);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body && typeof body.error === "string" ? body.error : FAILED;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) => request<T>(url, json("POST", body)),
  patch: <T>(url: string, body?: unknown) => request<T>(url, json("PATCH", body)),
  del: <T>(url: string, body?: unknown) =>
    request<T>(url, body === undefined ? { method: "DELETE" } : json("DELETE", body)),
};

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "خطأ";
}
