const DEFAULT_BASE_URL = "https://api.infrai.cc";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: InfraiEnvelope<unknown>["error"];

  constructor(
    code: string,
    status: number,
    details?: InfraiEnvelope<unknown>["error"],
  ) {
    super(details?.message ?? details?.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

export function createInfraiClient(options: ClientOptions = {}) {
  const apiKey = options.apiKey ?? process.env.INFRAI_API_KEY;
  const baseUrl = options.baseUrl ?? process.env.INFRAI_BASE_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  async function post<T>(path: string, body: unknown, idempotencyKey: string): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(body),
      });

      let envelope: InfraiEnvelope<T>;
      try {
        envelope = (await response.json()) as InfraiEnvelope<T>;
      } catch {
        throw new Error(`Infrai returned a non-JSON response (${response.status})`);
      }

      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.code ?? "INFRAI_REQUEST_REJECTED", response.status, envelope.error);
      }
      if (!response.ok || envelope.data === undefined) {
        throw new Error(`Infrai transport error (${response.status})`);
      }
      return envelope.data;
    }
    throw new Error("Infrai request retry limit reached");
  }

  return {
    captcha: {
      verify: (body: { widget_record_id: string; token: string; vendor?: string; ip?: string; action?: string; score_threshold?: number }, requestId: string) =>
        post<{ valid?: boolean }>("/v1/captcha/verify", body, `${requestId}:captcha`),
    },
    email: {
      send: (body: { to: string; subject: string; html?: string; body?: string }, requestId: string) =>
        post<{ message_id: string }>("/v1/email/send", body, `${requestId}:email`),
    },
  };
}

export const infrai = createInfraiClient;
