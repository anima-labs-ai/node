import type { WebhookEvent } from "./types";
import { constructWebhookEvent } from "./webhooks";

/**
 * Express-compatible middleware that verifies webhook signatures and
 * attaches the parsed event to `req.webhookEvent`.
 *
 * Usage:
 * ```typescript
 * import { webhookMiddleware } from "anima";
 *
 * app.post("/webhooks", webhookMiddleware("whsec_..."), (req, res) => {
 *   const event = req.webhookEvent;
 *   // handle event
 *   res.sendStatus(200);
 * });
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
		const signature =
			req.headers["anima-signature"] ?? req.headers["x-anima-signature"];
		if (!signature || typeof signature !== "string") {
			res.status(400).json({ error: "Missing webhook signature header" });
			return;
		}

		// Get raw body - Express needs express.raw() or express.json() with verify
		const body =
			typeof req.body === "string" ? req.body : JSON.stringify(req.body);

		try {
			const event = constructWebhookEvent(body, signature, secret);
			(req as WebhookRequest & { webhookEvent: WebhookEvent }).webhookEvent =
				event;
			next();
		} catch (err) {
			res.status(400).json({ error: "Invalid webhook signature" });
		}
	};
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
