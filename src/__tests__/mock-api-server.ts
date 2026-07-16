/**
 * In-process mock of the Anima API for the SDK integration test.
 *
 * CI has no anima monorepo checkout and no Postgres, so the integration
 * suite used to silently skip there — the exact "green tests, hollow
 * feature" failure mode this repo is trying to kill. This mock lets the
 * full SDK request pipeline (URL building incl. the /v1 prefix, auth
 * header, JSON bodies, pagination envelopes, error mapping) run against a
 * real HTTP hop in every CI run.
 *
 * It deliberately encodes API *intent*, not just shapes:
 * - every route lives under /v1 — a bare path 404s (the SDK once shipped
 *   a bug sending bare paths; this keeps that class dead),
 * - requests without a Bearer token get a 401 envelope,
 * - errors use the { error: { message, code } } envelope the SDK maps
 *   to typed errors,
 * - draft send converts the draft into a Message and deletes the draft
 *   (get-after-send must 404), mirroring the contract's documented
 *   send-and-delete semantics,
 * - draft send validates to/subject/body like the real handler (400),
 * - credential listing returns a BARE array (the endpoint is not
 *   paginated — the SDK once typed it as `{items}` and `.items` was
 *   silently undefined for every caller),
 * - credential issuance 403s platform-reserved types like the real
 *   handler (only org-attestation types are API-issuable).
 *
 * Runs under Bun (the test runtime) via Bun.serve.
 */

interface JsonRecord {
	[key: string]: unknown;
}

export interface MockApiServer {
	url: string;
	stop(): void;
}

function nowIso(): string {
	return new Date().toISOString();
}

function makeId(prefix: string): string {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function errorResponse(status: number, code: string, message: string): Response {
	return json({ error: { code, message } }, status);
}

function paginated(items: unknown[]): JsonRecord {
	return { items, pagination: { nextCursor: null, hasMore: false } };
}

export function startMockApiServer(): MockApiServer {
	const orgs = new Map<string, JsonRecord>();
	const agents = new Map<string, JsonRecord>();
	const messages = new Map<string, JsonRecord>();
	const drafts = new Map<string, JsonRecord>();
	const credentials = new Map<string, JsonRecord>();

	// Mirrors CREDENTIAL_TYPES in the contract: platform events auto-issue
	// the reserved types; only the org-attestation types are API-issuable.
	const API_ISSUABLE_CREDENTIAL_TYPES = new Set(["AnimaAddressVerified", "AnimaTrustScore"]);
	const PLATFORM_RESERVED_CREDENTIAL_TYPES = new Set([
		"AnimaEmailVerified",
		"AnimaPhoneVerified",
		"AnimaKYBCompleted",
		"AnimaPaymentCapable",
		"AnimaOwnerBound",
	]);

	function createMessageFromEmail(input: JsonRecord): JsonRecord {
		const id = makeId("msg");
		const message: JsonRecord = {
			id,
			agentId: input.agentId,
			channel: "EMAIL",
			direction: "OUTBOUND",
			status: "SENT",
			fromAddress: "mock-agent@agents.useanima.sh",
			toAddress: Array.isArray(input.to) ? String(input.to[0] ?? "") : String(input.to ?? ""),
			subject: (input.subject as string | undefined) ?? null,
			body: (input.body as string | undefined) ?? "",
			bodyHtml: (input.bodyHtml as string | undefined) ?? null,
			headers: null,
			metadata: (input.metadata as JsonRecord | undefined) ?? null,
			threadId: makeId("thread"),
			inReplyTo: (input.inReplyTo as string | undefined) ?? null,
			externalId: `<${id}@agents.useanima.sh>`,
			sentAt: nowIso(),
			receivedAt: null,
			attachments: [],
			createdAt: nowIso(),
			updatedAt: nowIso(),
		};
		messages.set(id, message);
		return message;
	}

	async function handle(req: Request): Promise<Response> {
		const url = new URL(req.url);
		const method = req.method.toUpperCase();

		// The API serves every route under exactly one /v1 mount. A request
		// arriving without it means the SDK's prefix handling regressed.
		if (!url.pathname.startsWith("/v1/")) {
			return errorResponse(404, "NOT_FOUND", `Route not found: ${url.pathname} (missing /v1 prefix?)`);
		}
		const path = url.pathname.slice("/v1".length);

		const authHeader = req.headers.get("authorization") ?? "";
		if (!/^Bearer .+$/.test(authHeader)) {
			return errorResponse(401, "UNAUTHORIZED", "Missing or malformed Authorization header");
		}

		const body: JsonRecord = ["POST", "PATCH", "PUT"].includes(method)
			? ((await req.json().catch(() => ({}))) as JsonRecord)
			: {};

		// --- Organizations -------------------------------------------------
		if (method === "POST" && path === "/orgs") {
			const id = makeId("org");
			const org: JsonRecord = {
				id,
				name: body.name,
				slug: body.slug,
				clerkOrgId: null,
				tier: "FREE",
				masterKey: `mk_mock_${crypto.randomUUID().replace(/-/g, "")}`,
				settings: {},
				createdAt: nowIso(),
				updatedAt: nowIso(),
			};
			orgs.set(id, org);
			return json(org);
		}
		let match = path.match(/^\/orgs\/([^/]+)$/);
		if (match) {
			const org = orgs.get(match[1] as string);
			if (!org) return errorResponse(404, "NOT_FOUND", "Organization not found");
			if (method === "GET") return json(org);
			if (method === "DELETE") {
				orgs.delete(org.id as string);
				return json(org);
			}
		}

		// --- Agents ---------------------------------------------------------
		if (method === "POST" && path === "/agents") {
			const id = makeId("agent");
			const agent: JsonRecord = {
				id,
				orgId: body.orgId,
				name: body.name,
				slug: body.slug,
				status: "ACTIVE",
				apiKeyPrefix: null,
				metadata: {},
				emailIdentities: [],
				phoneIdentities: [],
				createdAt: nowIso(),
				updatedAt: nowIso(),
			};
			agents.set(id, agent);
			return json(agent);
		}
		if (method === "GET" && path === "/agents") {
			const orgId = url.searchParams.get("orgId");
			const items = [...agents.values()].filter((a) => !orgId || a.orgId === orgId);
			return json(paginated(items));
		}
		match = path.match(/^\/agents\/([^/]+)$/);
		if (match) {
			const agent = agents.get(match[1] as string);
			if (!agent) return errorResponse(404, "NOT_FOUND", "Agent not found");
			if (method === "DELETE") {
				agents.delete(agent.id as string);
				return json(agent);
			}
		}

		// --- Verifiable credentials -------------------------------------------
		match = path.match(/^\/agents\/([^/]+)\/credentials$/);
		if (match) {
			const agentId = match[1] as string;
			const agent = agents.get(agentId);
			if (!agent) return errorResponse(404, "NOT_FOUND", "Agent not found");
			if (method === "GET") {
				// Bare array on purpose — the endpoint is NOT paginated. Wrapping
				// this in { items } is exactly the envelope lie the SDK shipped.
				const items = [...credentials.values()]
					.filter((c) => c.agentId === agentId)
					.reverse();
				return json(items);
			}
			if (method === "POST") {
				const type = String(body.type ?? "");
				if (PLATFORM_RESERVED_CREDENTIAL_TYPES.has(type)) {
					return errorResponse(
						403,
						"FORBIDDEN",
						`${type} is platform-reserved — it is auto-issued by its verification event`,
					);
				}
				if (!API_ISSUABLE_CREDENTIAL_TYPES.has(type)) {
					return errorResponse(400, "VALIDATION_ERROR", `Unknown credential type: ${type}`);
				}
				const id = makeId("vc");
				const issuedAt = nowIso();
				const expiresInSeconds = body.expiresInSeconds as number | undefined;
				const credential: JsonRecord = {
					id,
					agentId,
					orgId: (agent.orgId as string | undefined) ?? makeId("org"),
					type,
					jwtVc: `mock.jwt.${id}`,
					issuerDid: "did:web:agents.useanima.sh",
					subjectDid: `did:web:agents.useanima.sh:mock:${agentId}`,
					issuedAt,
					expiresAt: expiresInSeconds ? new Date(Date.now() + expiresInSeconds * 1000).toISOString() : null,
					revoked: false,
					revokedAt: null,
					revocationIndex: null,
					metadata: { source: "api", claims: (body.claims as JsonRecord | undefined) ?? {} },
					createdAt: issuedAt,
					updatedAt: issuedAt,
				};
				credentials.set(id, credential);
				return json(credential);
			}
		}
		match = path.match(/^\/agents\/([^/]+)\/credentials\/([^/]+)\/revoke$/);
		if (match && method === "POST") {
			const credential = credentials.get(match[2] as string);
			if (!credential || credential.agentId !== (match[1] as string)) {
				return errorResponse(404, "NOT_FOUND", "Credential not found");
			}
			credential.revoked = true;
			credential.revokedAt = nowIso();
			credential.revocationIndex = 0;
			credential.updatedAt = nowIso();
			return json(credential);
		}

		// --- Messages ---------------------------------------------------------
		if (method === "POST" && path === "/messages/email") {
			return json(createMessageFromEmail(body));
		}
		if (method === "GET" && path === "/messages") {
			const agentId = url.searchParams.get("agentId");
			// Newest-first, like the real /v1/messages.
			const items = [...messages.values()].filter((m) => !agentId || m.agentId === agentId).reverse();
			return json(paginated(items));
		}
		if (method === "POST" && path === "/messages/search/semantic") {
			const query = String(body.query ?? "").toLowerCase();
			const tokens = query.split(/\s+/).filter(Boolean);
			const threshold = typeof body.threshold === "number" ? body.threshold : 0.7;
			const limit = typeof body.limit === "number" ? body.limit : 10;
			const agentId = body.agentId as string | undefined;

			const results = [...messages.values()]
				.filter((m) => !agentId || m.agentId === agentId)
				.map((m) => {
					const content = String(m.body ?? "").toLowerCase();
					const matched = tokens.filter((t) => content.includes(t)).length;
					// Naive stand-in for cosine similarity: overlap ratio scaled
					// into (0.7, 0.95] so any token match clears the default
					// threshold, no match scores 0.
					const similarity = matched === 0 ? 0 : 0.7 + 0.25 * (matched / tokens.length);
					return { message: m, similarity };
				})
				.filter((r) => r.similarity > threshold)
				.sort((a, b) => b.similarity - a.similarity)
				.slice(0, limit)
				.map((r) => ({
					id: r.message.id,
					content: r.message.body,
					similarity: r.similarity,
					channel: r.message.channel,
					direction: r.message.direction,
					createdAt: r.message.createdAt,
					agentId: r.message.agentId,
				}));

			return json({ results });
		}

		// --- Email drafts -----------------------------------------------------
		if (method === "POST" && path === "/email/drafts") {
			const id = makeId("draft");
			const draft: JsonRecord = {
				id,
				agentId: body.agentId,
				orgId: [...orgs.keys()][0] ?? makeId("org"),
				fromIdentityId: (body.fromIdentityId as string | undefined) ?? null,
				to: (body.to as string[] | undefined) ?? [],
				cc: (body.cc as string[] | undefined) ?? [],
				bcc: (body.bcc as string[] | undefined) ?? [],
				subject: (body.subject as string | undefined) ?? null,
				body: (body.body as string | undefined) ?? null,
				bodyHtml: (body.bodyHtml as string | undefined) ?? null,
				inReplyTo: (body.inReplyTo as string | undefined) ?? null,
				references: (body.references as string[] | undefined) ?? [],
				metadata: (body.metadata as JsonRecord | undefined) ?? null,
				createdAt: nowIso(),
				updatedAt: nowIso(),
			};
			drafts.set(id, draft);
			return json(draft);
		}
		if (method === "GET" && path === "/email/drafts") {
			const agentId = url.searchParams.get("agentId");
			const items = [...drafts.values()].filter((d) => !agentId || d.agentId === agentId).reverse();
			return json(paginated(items));
		}
		match = path.match(/^\/email\/drafts\/([^/]+)\/send$/);
		if (match && method === "POST") {
			const draft = drafts.get(match[1] as string);
			if (!draft) return errorResponse(404, "NOT_FOUND", "EmailDraft not found");
			const to = draft.to as string[];
			if (to.length === 0) {
				return errorResponse(400, "VALIDATION_ERROR", "Draft must have at least one recipient before sending");
			}
			if (!draft.subject) {
				return errorResponse(400, "VALIDATION_ERROR", "Draft must have a subject before sending");
			}
			if (!draft.body) {
				return errorResponse(400, "VALIDATION_ERROR", "Draft must have a body before sending");
			}
			// Send-and-delete semantics: the draft becomes a Message and the
			// draft row is gone — a later GET on the draft id must 404.
			const message = createMessageFromEmail({
				agentId: draft.agentId,
				to,
				subject: draft.subject,
				body: draft.body,
				bodyHtml: draft.bodyHtml,
				inReplyTo: draft.inReplyTo,
			});
			drafts.delete(draft.id as string);
			return json(message);
		}
		match = path.match(/^\/email\/drafts\/([^/]+)$/);
		if (match) {
			const draft = drafts.get(match[1] as string);
			if (!draft) return errorResponse(404, "NOT_FOUND", "EmailDraft not found");
			if (method === "GET") return json(draft);
			if (method === "DELETE") {
				drafts.delete(draft.id as string);
				// The contract returns the deleted draft, not an empty body.
				return json(draft);
			}
		}

		return errorResponse(404, "NOT_FOUND", `Route not found: ${method} ${url.pathname}`);
	}

	const server = Bun.serve({ port: 0, fetch: handle });

	return {
		url: `http://localhost:${server.port}`,
		stop: () => {
			void server.stop(true);
		},
	};
}
