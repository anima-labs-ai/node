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

// This integration test boots the Anima API server in-process and runs a
// real SDK call through it. That requires the API monorepo checked out on
// disk + its deps installed + a local Postgres. We keep this test out of
// `npm test` (see package.json scripts) and make it opt-in for local dev.
//
// Path resolution: the SDK ships as its own repo, but in dev we typically
// sit next to the anima monorepo, so the default path walks up from
// `node/src/__tests__/` to `agenticmail/anima/apps/api/src/server`. Override
// with ANIMA_API_SERVER_PATH when you've got a different layout.
//
// We use a dynamic import + try/catch so a missing server module just
// skips the suite instead of crashing the whole file load (which would
// also take out the bun test runner's ability to report anything).
const apiServerPath =
	process.env.ANIMA_API_SERVER_PATH ?? "../../../anima/apps/api/src/server";

let createServer:
	| ((typeof import("../../../anima/apps/api/src/server"))["createServer"])
	| null = null;
let loadError: unknown = null;

try {
	const serverModule = (await import(
		`${apiServerPath}?sdk-int=${Math.random()}`
	)) as typeof import("../../../anima/apps/api/src/server");
	createServer = serverModule.createServer;
} catch (err) {
	loadError = err;
}

import { Anima } from "../index";

const describeIntegration = createServer ? describe : describe.skip;

if (!createServer) {
	// eslint-disable-next-line no-console
	console.warn(
		`[sdk integration] Skipping suite — couldn't load API server from "${apiServerPath}".`,
		`Set ANIMA_API_SERVER_PATH to the path of anima/apps/api/src/server to run.`,
		`Original error: ${loadError instanceof Error ? loadError.message : String(loadError)}`,
	);
}

describeIntegration("sdk integration flow", () => {
	let app: Awaited<ReturnType<NonNullable<typeof createServer>>>;
	let baseUrl: string;

	beforeAll(async () => {
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
	}, 30_000);

	afterAll(async () => {
		if (app) {
			await app.close();
		}
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
});
