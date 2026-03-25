import { createHmac, timingSafeEqual } from "node:crypto";

import { ValidationError } from "./errors";
import type { WebhookEvent, WebhookVerificationOptions } from "./types";

const DEFAULT_TOLERANCE_SECONDS = 300;

function getTimestampAndSignature(signatureHeader: string): { timestamp: number; signature: string } {
	const pieces = signatureHeader.split(",").map((part) => part.trim());
	let timestamp: number | null = null;
	let signature: string | null = null;

	for (const piece of pieces) {
		const [key, value] = piece.split("=", 2);
		if (!key || !value) {
			continue;
		}

		if (key === "t") {
			timestamp = Number(value);
		}
		if (key === "v1") {
			signature = value;
		}
	}

	if (!timestamp || !signature) {
		throw new ValidationError("Invalid webhook signature header format");
	}

	return { timestamp, signature };
}

function toPayloadString(payload: string | Buffer): string {
	return typeof payload === "string" ? payload : payload.toString("utf8");
}

function buildSignedPayload(payload: string | Buffer, timestamp: number): string {
	return `${timestamp}.${toPayloadString(payload)}`;
}

export function verifyWebhookSignature(
	payload: string | Buffer,
	signatureHeader: string,
	secret: string,
	options?: WebhookVerificationOptions,
): boolean {
	const { timestamp, signature } = getTimestampAndSignature(signatureHeader);
	const now = options?.now ?? Date.now();
	const toleranceSeconds = options?.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;

	const ageSeconds = Math.floor(Math.abs(now - timestamp * 1000) / 1000);
	if (ageSeconds > toleranceSeconds) {
		return false;
	}

	const expectedSignature = createHmac("sha256", secret)
		.update(buildSignedPayload(payload, timestamp))
		.digest("hex");

	const expectedBuffer = Buffer.from(expectedSignature, "hex");
	const actualBuffer = Buffer.from(signature, "hex");

	if (expectedBuffer.length !== actualBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function constructWebhookEvent(
	payload: string | Buffer,
	signatureHeader: string,
	secret: string,
	options?: WebhookVerificationOptions,
): WebhookEvent {
	const isValid = verifyWebhookSignature(payload, signatureHeader, secret, options);
	if (!isValid) {
		throw new ValidationError("Invalid webhook signature");
	}

	const payloadText = toPayloadString(payload);
	const parsed = JSON.parse(payloadText) as unknown;
	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new ValidationError("Invalid webhook payload format");
	}

	const obj = parsed as Record<string, unknown>;
	if (typeof obj.type !== "string") {
		throw new ValidationError("Webhook payload missing event type");
	}

	const dataRaw = obj.data;
	if (!dataRaw || typeof dataRaw !== "object" || Array.isArray(dataRaw)) {
		throw new ValidationError("Webhook payload missing data object");
	}

	const event: WebhookEvent = {
		type: obj.type as WebhookEvent["type"],
		data: dataRaw as Record<string, unknown>,
	};

	if (typeof obj.id === "string") {
		event.id = obj.id;
	}
	if (typeof obj.createdAt === "string") {
		event.createdAt = obj.createdAt;
	}

	return event;
}
