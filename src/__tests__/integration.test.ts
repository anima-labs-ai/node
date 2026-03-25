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
	class SESv2Client {
		send = sesSendMock;
	}
	class SendEmailCommand {
		constructor(public input: unknown) {
			void input;
		}
	}
	class CreateEmailIdentityCommand {
		constructor(public input: unknown) {
			void input;
		}
	}
	class GetEmailIdentityCommand {
		constructor(public input: unknown) {
			void input;
		}
	}
	class DeleteEmailIdentityCommand {
		constructor(public input: unknown) {
			void input;
		}
	}
	return {
		SESv2Client,
		SendEmailCommand,
		CreateEmailIdentityCommand,
		GetEmailIdentityCommand,
		DeleteEmailIdentityCommand,
	};
});

mock.module("node:dns/promises", () => ({
	resolveTxt: mock(async () => [["v=spf1 include:amazonses.com ~all"]]),
	resolveMx: mock(async () => [{ exchange: "mx.example.com", priority: 10 }]),
}));

const { createServer } = await import(
	`../../../../apps/api/src/server?sdk-int=${Math.random()}`
);

import { Anima } from "../index";

describe("sdk integration flow", () => {
	let app: Awaited<ReturnType<typeof createServer>>;
	let baseUrl: string;

	beforeAll(async () => {
		app = await createServer();
		await app.listen({ port: 0 });
		const addr = app.server.address();
		if (!addr || typeof addr === "string") {
			throw new Error("Failed to get server address");
		}
		baseUrl = `http://localhost:${addr.port}/api`;
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
