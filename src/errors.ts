export class AnimaError extends Error {
	public readonly details?: unknown;

	public constructor(message: string, details?: unknown) {
		super(message);
		this.name = "AnimaError";
		this.details = details;
	}
}

export class APIError extends AnimaError {
	public readonly status: number;
	public readonly code?: string;

	public constructor(message: string, status: number, code?: string, details?: unknown) {
		super(message, details);
		this.name = "APIError";
		this.status = status;
		this.code = code;
	}
}

export class AuthError extends APIError {
	public constructor(message = "Authentication failed", details?: unknown) {
		super(message, 401, "AUTH_ERROR", details);
		this.name = "AuthError";
	}
}

export class NotFoundError extends APIError {
	public constructor(message = "Resource not found", details?: unknown) {
		super(message, 404, "NOT_FOUND", details);
		this.name = "NotFoundError";
	}
}

export class RateLimitError extends APIError {
	public readonly retryAfter?: number;

	public constructor(message = "Rate limit exceeded", retryAfter?: number, details?: unknown) {
		super(message, 429, "RATE_LIMIT", details);
		this.name = "RateLimitError";
		this.retryAfter = retryAfter;
	}
}

export class ValidationError extends APIError {
	public constructor(message = "Validation failed", details?: unknown) {
		super(message, 400, "VALIDATION_ERROR", details);
		this.name = "ValidationError";
	}
}

export class ConflictError extends APIError {
	public constructor(message = "Resource conflict", details?: unknown) {
		super(message, 409, "CONFLICT", details);
		this.name = "ConflictError";
	}
}

export class InternalServerError extends APIError {
	public constructor(message = "Internal server error", status = 500, details?: unknown) {
		super(message, status, "INTERNAL_ERROR", details);
		this.name = "InternalServerError";
	}
}
