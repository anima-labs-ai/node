import { APIError, AuthError, NotFoundError, RateLimitError, ValidationError } from "./errors";
import type { AnimaClientOptions, ApiErrorEnvelope } from "./types";

const DEFAULT_BASE_URL = "https://api.anima.com";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000] as const;

export interface RequestClient {
	request<T>(
		method: string,
		path: string,
		body?: unknown,
		query?: Record<string, string>,
	): Promise<T>;
}

export class AnimaClient implements RequestClient {
	private readonly apiKey: string;
	private readonly baseUrl: string;
	private readonly timeout: number;
	private readonly maxRetries: number;

	public constructor(options: AnimaClientOptions) {
		this.apiKey = options.apiKey;
		this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
		this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
		this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
	}

	public async request<T>(
		method: string,
		path: string,
		body?: unknown,
		query?: Record<string, string>,
	): Promise<T> {
		const url = this.buildUrl(path, query);

		for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.timeout);

			try {
			const headers: Record<string, string> = {
					Authorization: `Bearer ${this.apiKey}`,
				};
				if (body !== undefined) {
					headers["Content-Type"] = "application/json";
				}

				const response = await fetch(url, {
					method,
					headers,
					body: body !== undefined ? JSON.stringify(body) : undefined,
					signal: controller.signal,
				});

				if (response.ok) {
					if (response.status === 204) {
						return undefined as T;
					}

					return (await response.json()) as T;
				}

				const shouldRetry = this.shouldRetry(response.status) && attempt < this.maxRetries;
				if (shouldRetry) {
					const delayMs = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 4_000;
					await this.wait(delayMs);
					continue;
				}

				throw await this.parseError(response);
			} catch (error) {
				if (error instanceof APIError) {
					throw error;
				}

				const isAbortError = error instanceof Error && error.name === "AbortError";
				if (isAbortError) {
					throw new APIError(`Request timed out after ${this.timeout}ms`, 408, "TIMEOUT");
				}

				const shouldRetry = attempt < this.maxRetries;
				if (shouldRetry) {
					const delayMs = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)] ?? 4_000;
					await this.wait(delayMs);
					continue;
				}

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

	private buildUrl(path: string, query?: Record<string, string>): string {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const url = new URL(`${this.baseUrl}${normalizedPath}`);

		if (query) {
			for (const [key, value] of Object.entries(query)) {
				url.searchParams.set(key, value);
			}
		}

		return url.toString();
	}

	private shouldRetry(status: number): boolean {
		return status === 429 || status >= 500;
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
			case 429:
				return new RateLimitError(message, retryAfter, details);
			default:
				return new APIError(message, response.status, code, details);
		}
	}
}
