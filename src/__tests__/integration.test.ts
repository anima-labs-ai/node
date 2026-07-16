import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

process.env.DATABASE_URL ??=
	"postgresql://anima:anima@localhost:5433/anima";
process.env.AWS_SES_REGION ??= "us-east-1";

// Mocks MUST be registered before the server import below
const sesSendMock = mock(async (_command: unknown) => ({
	MessageId: `ses-${crypto.randomUUID()}`,
	DkimAttributes: { Tokens: ["dkim_token"] },
	VerifiedForSendingStatus: true,
	VerificationStatus: "SUCCESS",
}));

mock.module("@aws-sdk/client-sesv2", () => {
	// Mirror the named exports used in anima/packages/email/src/ses-client.ts.
	// If the email package adds a new SES command, this mock must grow too,
	// or Bun's strict ESM resolution will fail the whole file with
	// "Export named X not found". Command classes are empty stubs — the
	// client.send mock above is what actually returns data.
	class SESv2Client {
		send = sesSendMock;
	}
	const stubCommand = (name: string) => {
		const ctor = class {
			constructor(public input: unknown) {
				void input;
			}
		};
		Object.defineProperty(ctor, "name", { value: name });
		return ctor;
	};
	return {
		SESv2Client,
		SendEmailCommand: stubCommand("SendEmailCommand"),
		CreateEmailIdentityCommand: stubCommand("CreateEmailIdentityCommand"),
		GetEmailIdentityCommand: stubCommand("GetEmailIdentityCommand"),
		DeleteEmailIdentityCommand: stubCommand("DeleteEmailIdentityCommand"),
		PutEmailIdentityMailFromAttributesCommand: stubCommand(
			"PutEmailIdentityMailFromAttributesCommand",
		),
	};
});

mock.module("node:dns/promises", () => ({
	// The DKIM/SPF verification path in the API reaches for resolveTxt /
	// resolveMx / resolveCname; once we `mock.module`, the real module is
	// replaced wholesale, so every function the server imports has to be
	// stubbed or the bundler will throw "Export named X not found". If you
	// see that error, add the missing symbol here rather than removing
	// the mock entirely.
	resolveTxt: mock(async () => [["v=spf1 include:amazonses.com ~all"]]),
	resolveMx: mock(async () => [{ exchange: "mx.example.com", priority: 10 }]),
	resolveCname: mock(async () => [] as string[]),
	resolve4: mock(async () => ["203.0.113.1"] as string[]),
	resolve6: mock(async () => [] as string[]),
}));

// This suite runs the SDK against a real HTTP server in one of two modes:
//
// - "real": boots the Anima API monorepo server in-process. Requires the
//   monorepo checked out on disk + its deps installed + a local Postgres.
//   Path resolution: the SDK ships as its own repo, but in dev we typically
//   sit next to the anima monorepo, so the default path walks up from
//   `node/src/__tests__/` to `anima/apps/api/src/server`. Override with
//   ANIMA_API_SERVER_PATH for a different layout.
//
// - "mock": an in-process stand-in (see mock-api-server.ts) implementing
//   the endpoints this suite exercises, with the API's envelope shapes,
//   /v1-only routing, and draft send-and-delete semantics.
//
// Mode selection via ANIMA_SDK_INT_MODE:
//   "real" — require the monorepo server; FAIL if it can't load.
//   "mock" — always use the mock (don't even try the monorepo).
//   unset  — auto: real when loadable, mock otherwise. CI takes the mock
//            path (no monorepo checkout there), so this suite always runs
//            in CI instead of silently skipping — a suite that only ever
//            skipped is how SDK send paths went uncovered for months.
const intMode = process.env.ANIMA_SDK_INT_MODE ?? "auto";

const apiServerPath =
	process.env.ANIMA_API_SERVER_PATH ?? "../../../anima/apps/api/src/server";

// Structural stand-in for the monorepo's `createServer` (a Fastify factory).
// Typed structurally — NOT via `typeof import("…/anima/…")` — because the
// monorepo isn't on disk in CI and tests are typechecked there
// (tsconfig.tests.json); a path-based type import would fail compilation.
interface AnimaApiServer {
	listen(opts: { port: number }): Promise<unknown>;
	close(): Promise<unknown>;
	server: { address(): { port: number } | string | null };
}
type CreateApiServer = () => Promise<AnimaApiServer>;

let createServer: CreateApiServer | null = null;
let loadError: unknown = null;

if (intMode !== "mock") {
	try {
		const serverModule = (await import(
			`${apiServerPath}?sdk-int=${Math.random()}`
		)) as { createServer: CreateApiServer };
		createServer = serverModule.createServer;
	} catch (err) {
		loadError = err;
	}
}

if (intMode === "real" && !createServer) {
	throw new Error(
		`ANIMA_SDK_INT_MODE=real but the API server could not be loaded from "${apiServerPath}". ` +
			`Set ANIMA_API_SERVER_PATH to the path of anima/apps/api/src/server. ` +
			`Original error: ${loadError instanceof Error ? loadError.message : String(loadError)}`,
	);
}

import { Anima, NotFoundError, ValidationError } from "../index";
import { startMockApiServer, type MockApiServer } from "./mock-api-server";

const mode: "real" | "mock" = createServer ? "real" : "mock";

if (mode === "mock" && intMode === "auto") {
	// eslint-disable-next-line no-console
	console.info(
		`[sdk integration] Anima API server not loadable from "${apiServerPath}" — running against the in-process mock. ` +
			`Set ANIMA_SDK_INT_MODE=real (plus ANIMA_API_SERVER_PATH if needed) to force the real server.`,
	);
}

describe(`sdk integration flow (${mode} server)`, () => {
	let app: AnimaApiServer | null = null;
	let mockServer: MockApiServer | null = null;
	let baseUrl: string;

	beforeAll(async () => {
		if (mode === "real") {
			if (!createServer) throw new Error("createServer not loaded");
			app = await createServer();
			await app.listen({ port: 0 });
			const addr = app.server.address();
			if (!addr || typeof addr === "string") {
				throw new Error("Failed to get server address");
			}
			// Routes used to sit under /api; that prefix was removed in the oRPC
			// refactor (see anima commit 808386f). The baseUrl is now the naked
			// server root — the SDK's client builder no longer prepends /api
			// either, so both sides agree.
			baseUrl = `http://localhost:${addr.port}`;
		} else {
			mockServer = startMockApiServer();
			baseUrl = mockServer.url;
		}
	}, 30_000);

	afterAll(async () => {
		if (app) {
			await app.close();
		}
		mockServer?.stop();
	});

	test("full lifecycle: create org → agent → send email → list → cleanup", async () => {
		const slug = `sdk-int-${Date.now()}`;

		const bootstrap = new Anima({
			apiKey: "mk_bootstrap_dummy",
			baseUrl,
			maxRetries: 0,
		});

		const org = await bootstrap.organizations.create({
			name: "SDK Integration Org",
			slug,
		});

		expect(org.id).toBeDefined();
		expect(org.name).toBe("SDK Integration Org");
		expect(org.slug).toBe(slug);
		expect(org.masterKey).toMatch(/^mk_/);

		const am = new Anima({
			apiKey: org.masterKey,
			baseUrl,
			maxRetries: 0,
		});

		const agentSlug = `int-agent-${Date.now()}`;
		const agent = await am.agents.create({
			orgId: org.id,
			name: "Integration Agent",
			slug: agentSlug,
		});

		expect(agent.id).toBeDefined();
		expect(agent.name).toBe("Integration Agent");
		expect(agent.orgId).toBe(org.id);

		const message = await am.messages.sendEmail({
			agentId: agent.id,
			to: ["integration@example.com"],
			subject: "SDK Integration Test",
			body: "Hello from SDK integration test",
		});

		expect(message.id).toBeDefined();
		expect(message.channel).toBe("EMAIL");
		expect(message.direction).toBe("OUTBOUND");
		expect(message.status).toBe("SENT");

		const messages = await am.messages.list({
			agentId: agent.id,
			limit: 10,
		});

		expect(messages.items.length).toBeGreaterThanOrEqual(1);
		const found = messages.items.find((m) => m.id === message.id);
		expect(found).toBeDefined();

		const fetchedOrg = await am.organizations.get(org.id);
		expect(fetchedOrg.id).toBe(org.id);
		expect(fetchedOrg.name).toBe("SDK Integration Org");

		const agents = await am.agents.list({ orgId: org.id });
		expect(agents.items.length).toBeGreaterThanOrEqual(1);

		await am.agents.delete(agent.id);
		await am.organizations.delete(org.id);
	}, 30_000);

	test("drafts lifecycle: send converts the draft into a Message and deletes it", async () => {
		const slug = `sdk-drafts-${Date.now()}`;

		const bootstrap = new Anima({
			apiKey: "mk_bootstrap_dummy",
			baseUrl,
			maxRetries: 0,
		});
		const org = await bootstrap.organizations.create({
			name: "SDK Drafts Org",
			slug,
		});
		const am = new Anima({ apiKey: org.masterKey, baseUrl, maxRetries: 0 });
		const agent = await am.agents.create({
			orgId: org.id,
			name: "Drafts Agent",
			slug: `drafts-agent-${Date.now()}`,
		});

		// Drafts may be incomplete — but sending one must fail LOUDLY, not
		// silently drop the email.
		const incomplete = await am.drafts.create({
			agentId: agent.id,
			subject: "Quarterly report",
			body: "Numbers attached.",
		});
		expect(incomplete.id).toBeDefined();
		expect(incomplete.to).toEqual([]);
		expect(incomplete.subject).toBe("Quarterly report");
		await expect(am.drafts.send(incomplete.id)).rejects.toThrow(ValidationError);
		// A failed send keeps the draft so the caller can fix and retry.
		const survived = await am.drafts.get(incomplete.id);
		expect(survived.id).toBe(incomplete.id);

		const complete = await am.drafts.create({
			agentId: agent.id,
			to: ["counterparty@example.com"],
			subject: "Quarterly report",
			body: "Numbers attached.",
		});

		const listed = await am.drafts.list({ agentId: agent.id, limit: 10 });
		const listedIds = listed.items.map((d) => d.id);
		expect(listedIds).toContain(incomplete.id);
		expect(listedIds).toContain(complete.id);

		// send: the draft becomes a real outbound EMAIL Message…
		const sent = await am.drafts.send(complete.id);
		expect(sent.channel).toBe("EMAIL");
		expect(sent.direction).toBe("OUTBOUND");
		expect(sent.status).toBe("SENT");
		expect(sent.subject).toBe("Quarterly report");
		expect(sent.agentId).toBe(agent.id);

		// …and the draft row is gone (send-and-delete semantics).
		await expect(am.drafts.get(complete.id)).rejects.toThrow(NotFoundError);

		// delete without sending returns the deleted draft, then 404s.
		const deleted = await am.drafts.delete(incomplete.id);
		expect(deleted.id).toBe(incomplete.id);
		await expect(am.drafts.get(incomplete.id)).rejects.toThrow(NotFoundError);

		await am.agents.delete(agent.id);
		await am.organizations.delete(org.id);
	}, 30_000);

	test("semanticSearch returns the ranked-results envelope from /messages/search/semantic", async () => {
		const slug = `sdk-sem-${Date.now()}`;

		const bootstrap = new Anima({
			apiKey: "mk_bootstrap_dummy",
			baseUrl,
			maxRetries: 0,
		});
		const org = await bootstrap.organizations.create({
			name: "SDK Semantic Org",
			slug,
		});
		const am = new Anima({ apiKey: org.masterKey, baseUrl, maxRetries: 0 });
		const agent = await am.agents.create({
			orgId: org.id,
			name: "Semantic Agent",
			slug: `sem-agent-${Date.now()}`,
		});

		await am.messages.sendEmail({
			agentId: agent.id,
			to: ["a@example.com"],
			subject: "Invoice",
			body: "The crocodile invoice for July is overdue",
		});
		await am.messages.sendEmail({
			agentId: agent.id,
			to: ["b@example.com"],
			subject: "Standup",
			body: "Daily standup moved to 10am",
		});

		const out = await am.messages.semanticSearch("crocodile invoice", {
			agentId: agent.id,
			limit: 5,
		});

		// The envelope shape is the SDK-owned part and holds in both modes.
		expect(Array.isArray(out.results)).toBe(true);

		if (mode === "mock") {
			// Result *content* is only deterministic against the mock — in real
			// mode it depends on an embedding provider being configured (absent
			// locally, the server legitimately returns zero results).
			expect(out.results.length).toBeGreaterThanOrEqual(1);
			const top = out.results[0];
			if (!top) throw new Error("expected a top result");
			expect(top.content).toContain("crocodile");
			expect(top.similarity).toBeGreaterThan(0.7);
			expect(top.agentId).toBe(agent.id);
			expect(top.channel).toBe("EMAIL");
			expect(top.direction).toBe("OUTBOUND");
			// And the off-topic standup message must not outrank the match.
			expect(top.content).not.toContain("standup");
		}

		await am.agents.delete(agent.id);
		await am.organizations.delete(org.id);
	}, 30_000);
});
