import type { WebhookEvent } from "./types";
import { constructWebhookEvent } from "./webhooks";

/**
 * Express-compatible middleware that verifies webhook signatures and
 * attaches the parsed event to `req.webhookEvent`.
 *
 * Mount it with a **raw body parser**. The signature covers the exact bytes the
 * platform sent, so a body that has been parsed and re-serialised will not
 * verify even when the delivery is genuine — `JSON.stringify` can reorder keys
 * and drop whitespace.
 *
 * ```typescript
 * import express from "express";
 * import { webhookMiddleware } from "@anima-labs/sdk";
 *
 * app.post(
 *   "/webhooks",
 *   express.raw({ type: "application/json" }),
 *   webhookMiddleware(process.env.ANIMA_WEBHOOK_SECRET!),
 *   (req, res) => {
 *     const event = req.webhookEvent;   // flat: event, occurredAt, ...fields
 *     res.sendStatus(200);
 *   },
 * );
 * ```
 */
export function webhookMiddleware(
	secret: string,
): (
	req: WebhookRequest,
	res: WebhookResponse,
	next: (err?: unknown) => void,
) => void {
	return (req, res, next) => {
		const signature = headerValue(req, "x-anima-signature");
		const timestamp = headerValue(req, "x-anima-timestamp");

		if (!signature || !timestamp) {
			res
				.status(400)
				.json({ error: "Missing webhook signature or timestamp header" });
			return;
		}

		// Only a raw body can be verified; see the note above.
		if (typeof req.body !== "string" && !Buffer.isBuffer(req.body)) {
			res.status(400).json({
				error:
					"Webhook body must be raw. Mount express.raw({ type: 'application/json' }) before this middleware.",
			});
			return;
		}

		try {
			const event = constructWebhookEvent(
				req.body,
				{ signature, timestamp },
				secret,
			);
			(req as WebhookRequest & { webhookEvent: WebhookEvent }).webhookEvent =
				event;
			next();
		} catch {
			res.status(400).json({ error: "Invalid webhook signature" });
		}
	};
}

/** First value for a header, tolerating the string[] form some frameworks use. */
function headerValue(req: WebhookRequest, name: string): string | undefined {
	const raw = req.headers[name];
	if (typeof raw === "string") return raw;
	if (Array.isArray(raw)) return raw[0];
	return undefined;
}

/** Minimal request interface compatible with Express/Koa/Fastify */
interface WebhookRequest {
	headers: Record<string, string | string[] | undefined>;
	body: unknown;
	webhookEvent?: WebhookEvent;
}

/** Minimal response interface compatible with Express */
interface WebhookResponse {
	status(code: number): WebhookResponse;
	json(body: unknown): void;
}
