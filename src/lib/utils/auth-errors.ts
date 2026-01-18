export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export function mapSupabaseAuthError(error: unknown): ApiError {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes("already registered") || msg.includes("user already registered")) {
      return { status: 409, code: "email_exists", message: "EMAIL ALREADY REGISTERED" };
    }
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      return { status: 401, code: "invalid_credentials", message: "WRONG EMAIL OR PASSWORD" };
    }
    if (msg.includes("rate limit")) {
      return { status: 429, code: "rate_limited", message: "TOO MANY ATTEMPTS. TRY AGAIN LATER" };
    }
  }
  return { status: 500, code: "internal_error", message: "SOMETHING WENT WRONG. TRY AGAIN" };
}

export function errorResponse(error: ApiError): Response {
  return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
    status: error.status,
    headers: { "Content-Type": "application/json" },
  });
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
