import { APIError, AuthError, ConflictError, InternalServerError, NotFoundError, RateLimitError, ValidationError } from "./errors";
import { debug } from "./logger";
import type { AnimaClientOptions, ApiErrorEnvelope, RawResponse, RequestEvent, RequestOptions, ResponseEvent } from "./types";

const DEFAULT_BASE_URL = "https://api.useanima.sh";
// The Anima API serves every route under /v1. The version prefix lives in
// exactly one place — here — so resource methods pass BARE paths (e.g.
// "/agents"), mirroring the server, which applies the prefix once at mount
// time and keeps contract paths bare. Resource files must NOT hardcode "/v1".
const API_VERSION_PREFIX = "/v1";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 30_000;

export interface RequestClient {
	request<T>(
		method: string,
		path: string,
		body?: unknown,
		query?: Record<string, string | string[]>,
		options?: RequestOptions,
	): Promise<T>;
}

export class AnimaClient implements RequestClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly timeout: number;
	private readonly maxRetries: number;
	private readonly requestListeners: Array<(event: RequestEvent) => void> = [];
	private readonly responseListeners: Array<(event: ResponseEvent) => void> = [];

	public constructor(options: AnimaClientOptions = {}) {
		const apiKey = options.apiKey ?? process.env.ANIMA_API_KEY;
		if (!apiKey) {
			throw new Error(
				"Missing API key. Pass it as `apiKey` or set the ANIMA_API_KEY environment variable.",
			);
		}
		this.apiKey = apiKey;
		// Normalize to an origin: strip trailing slashes, then a redundant trailing
		// "/v1" (e.g. a caller who pasted the API banner's ".../v1" base URL). The
		// SDK owns the version prefix (API_VERSION_PREFIX), so leaving "/v1" here
		// would double-prefix to "/v1/v1" and 404.
		this.baseUrl = (options.baseUrl ?? process.env.ANIMA_API_URL ?? DEFAULT_BASE_URL)
			.replace(/\/+$/, "")
			.replace(/\/v1$/, "");
		this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
		this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
		debug("Client initialized", { baseUrl: this.baseUrl, timeout: this.timeout, maxRetries: this.maxRetries });
	}

	public on(event: "request", listener: (data: RequestEvent) => void): this;
	public on(event: "response", listener: (data: ResponseEvent) => void): this;
	public on(event: "request" | "response", listener: (data: never) => void): this {
		if (event === "request") this.requestListeners.push(listener as unknown as (data: RequestEvent) => void);
		else if (event === "response") this.responseListeners.push(listener as unknown as (data: ResponseEvent) => void);
		return this;
	}

	public off(event: "request", listener: (data: RequestEvent) => void): this;
	public off(event: "response", listener: (data: ResponseEvent) => void): this;
	public off(event: "request" | "response", listener: (data: never) => void): this {
		if (event === "request") {
			const idx = this.requestListeners.indexOf(listener as unknown as (data: RequestEvent) => void);
			if (idx !== -1) this.requestListeners.splice(idx, 1);
		} else if (event === "response") {
			const idx = this.responseListeners.indexOf(listener as unknown as (data: ResponseEvent) => void);
			if (idx !== -1) this.responseListeners.splice(idx, 1);
		}
		return this;
	}

	private emitRequest(data: RequestEvent): void {
		for (const fn of this.requestListeners) fn(data);
	}

	private emitResponse(data: ResponseEvent): void {
		for (const fn of this.responseListeners) fn(data);
	}

	public async request<T>(
		method: string,
		path: string,
		body?: unknown,
		// `string[]` values become repeated keys (`?labels=a&labels=b`) — the form
		// the API reads as an array. This matches the RequestClient interface and
		// what buildUrl has always done; the narrower `Record<string, string>` here
		// was the only thing stopping callers from passing a multi-value filter.
		query?: Record<string, string | string[]>,
		options?: RequestOptions,
	): Promise<T> {
		const url = this.buildUrl(path, query);
		const timeout = options?.timeout ?? this.timeout;
		const maxRetries = options?.maxRetries ?? this.maxRetries;
		const idempotencyKey = options?.idempotencyKey ?? (this.isMutating(method) ? crypto.randomUUID() : undefined);

		const startTime = Date.now();
		debug(`${method} ${path}`, { attempt: 0 });

		for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeout);

			try {
			const headers: Record<string, string> = {
					Authorization: `Bearer ${this.apiKey}`,
				};
				if (body !== undefined) {
					headers["Content-Type"] = "application/json";
				}
				if (idempotencyKey) {
					headers["Idempotency-Key"] = idempotencyKey;
				}

				if (attempt === 0) {
					this.emitRequest({ method, path, headers: { ...headers, Authorization: "Bearer [REDACTED]" } });
				}

				const response = await fetch(url, {
					method,
					headers,
					body: body !== undefined ? JSON.stringify(body) : undefined,
					signal: controller.signal,
				});

				const durationMs = Date.now() - startTime;
				const responseHeaders: Record<string, string> = {};
				response.headers.forEach((v, k) => { responseHeaders[k] = v; });
				this.emitResponse({ method, path, status: response.status, durationMs, headers: responseHeaders });

				if (response.ok) {
					debug(`${method} ${path} -> ${response.status}`, { durationMs });

					const data = response.status === 204 ? (undefined as T) : ((await response.json()) as T);

					if (options?.rawResponse) {
						return {
							data,
							response: this.buildRawResponse(response, durationMs),
						} as T;
					}

					return data;
				}

				const shouldRetry = this.shouldRetry(response.status) && attempt < maxRetries;
				if (shouldRetry) {
					const retryAfter = this.parseRetryAfter(response);
					const delayMs = retryAfter ?? this.jitteredDelay(attempt);
					debug(`${method} ${path} -> ${response.status}, retrying in ${Math.round(delayMs)}ms`, { attempt: attempt + 1 });
					await this.wait(delayMs);
					continue;
				}

				debug(`${method} ${path} -> ${response.status} (failed)`, { durationMs });
				throw await this.parseError(response);
			} catch (error) {
				if (error instanceof APIError) {
					throw error;
				}

				const isAbortError = error instanceof Error && error.name === "AbortError";
				if (isAbortError) {
					debug(`${method} ${path} -> timeout after ${Date.now() - startTime}ms`);
					throw new APIError(`Request timed out after ${this.timeout}ms`, 408, "TIMEOUT");
				}

				const shouldRetry = attempt < maxRetries;
				if (shouldRetry) {
					const delayMs = this.jitteredDelay(attempt);
					debug(`${method} ${path} -> network error, retrying in ${Math.round(delayMs)}ms`, { attempt: attempt + 1 });
					await this.wait(delayMs);
					continue;
				}

				debug(`${method} ${path} -> network error (failed)`, { durationMs: Date.now() - startTime });
				if (error instanceof Error) {
					throw new APIError(error.message, 0, "NETWORK_ERROR");
				}

				throw new APIError("Unknown network error", 0, "NETWORK_ERROR");
			} finally {
				clearTimeout(timeoutId);
			}
		}

		throw new APIError("Request failed after retries", 0, "RETRY_EXHAUSTED");
	}

	protected async wait(ms: number): Promise<void> {
		await new Promise<void>((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	private buildUrl(path: string, query?: Record<string, string | string[]>): string {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const url = new URL(`${this.baseUrl}${API_VERSION_PREFIX}${normalizedPath}`);

		if (query) {
			for (const [key, value] of Object.entries(query)) {
				if (Array.isArray(value)) {
					for (const v of value) {
						url.searchParams.append(key, v);
					}
				} else {
					url.searchParams.set(key, value);
				}
			}
		}

		return url.toString();
	}

	private jitteredDelay(attempt: number): number {
		const exponential = BASE_RETRY_DELAY_MS * 2 ** attempt;
		const jittered = Math.random() * exponential;
		return Math.min(jittered, MAX_RETRY_DELAY_MS);
	}

	private parseRetryAfter(response: Response): number | undefined {
		const header = response.headers.get("retry-after");
		if (!header) return undefined;
		const seconds = Number(header);
		return Number.isFinite(seconds) ? seconds * 1000 : undefined;
	}

	private isMutating(method: string): boolean {
		return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
	}

	private shouldRetry(status: number): boolean {
		return status === 429 || status >= 500;
	}

	private buildRawResponse(response: Response, durationMs: number): RawResponse {
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		return {
			status: response.status,
			headers,
			requestId: response.headers.get("x-request-id"),
			responseTimeMs: durationMs,
		};
	}

	private async parseError(response: Response): Promise<APIError> {
		const retryAfterHeader = response.headers.get("retry-after");
		const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

		let payload: ApiErrorEnvelope | null = null;
		try {
			payload = (await response.json()) as ApiErrorEnvelope;
		} catch {
			payload = null;
		}

		const message =
			payload?.error?.message ??
			payload?.message ??
			`Request failed with status ${response.status}`;
		const code = payload?.error?.code;
		const details = payload?.error?.details;

		switch (response.status) {
			case 400:
			case 422:
				return new ValidationError(message, details);
			case 401:
			case 403:
				return new AuthError(message, details);
			case 404:
				return new NotFoundError(message, details);
			case 409:
				return new ConflictError(message, details);
			case 429:
				return new RateLimitError(message, retryAfter, details);
			default:
				if (response.status >= 500) {
					return new InternalServerError(message, response.status, details);
				}
				return new APIError(message, response.status, code, details);
		}
	}
}
