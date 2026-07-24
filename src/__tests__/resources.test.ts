import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { A2AResource } from "../resources/a2a";
import { AgentsResource } from "../resources/agents";
import { DomainsResource } from "../resources/domains";
import { DraftsResource } from "../resources/drafts";
import { EmailsResource } from "../resources/emails";
import { IdentityResource } from "../resources/identity";
import { InboxesResource } from "../resources/inboxes";
import { MessagesResource } from "../resources/messages";
import { OrganizationsResource } from "../resources/organizations";
import { PhonesResource } from "../resources/phones";
import { SecurityResource } from "../resources/security";
import { WebhooksResource } from "../resources/webhooks";
import { VoicesResource } from "../resources/voices";
import { CallsResource } from "../resources/calls";
import { ExtensionResource } from "../resources/extension";
import { VaultResource } from "../resources/vault";

function createMockClient(): {
	client: RequestClient;
	requestMock: ReturnType<typeof mock>;
} {
	const requestMock = mock(async () => ({ ok: true }));
	const client: RequestClient = {
		request: requestMock as RequestClient["request"],
	};
	return { client, requestMock };
}

describe("resource methods", () => {
	test("organizations resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new OrganizationsResource(client);

		await resource.create({ name: "Acme", slug: "acme" });
		await resource.get("org_1");
		await resource.list({ limit: 10, cursor: "c1" });
		await resource.update("org_1", { name: "Acme 2" });
		await resource.rotateKey("org_1");
		await resource.delete("org_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/orgs",
			{ name: "Acme", slug: "acme" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/orgs/org_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/orgs", undefined, {
			limit: "10",
			cursor: "c1",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"PATCH",
			"/orgs/org_1",
			{ id: "org_1", name: "Acme 2" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/orgs/org_1/rotate-key",
			{ id: "org_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/orgs/org_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("vault useCredential brokers via POST /vault/credentials/{id}/use", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.useCredential("cred_1", {
			method: "GET",
			url: "https://api.example.com/v1/thing",
			headers: { "X-Keep": "1" },
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/credentials/cred_1/use",
			{
				method: "GET",
				url: "https://api.example.com/v1/thing",
				headers: { "X-Keep": "1" },
			},
			undefined,
			undefined,
		);
	});

	test("the agent-facing use path is the broker; reads are masked (never-see)", () => {
		const { client } = createMockClient();
		const resource = new VaultResource(client);
		// The old UNGATED exchangeToken() is gone; an agent uses secrets via the
		// broker (useCredential), and getCredential sends no reveal flag.
		expect(
			(resource as unknown as Record<string, unknown>).exchangeToken,
		).toBeUndefined();
		expect(typeof resource.useCredential).toBe("function");
		expect(typeof resource.getCredential).toBe("function");
	});

	test("vault listIdentities and audit query under /vault with filters", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		// PageIterator is awaitable (thenable) — awaiting fetches the first page.
		await resource.listIdentities({ status: "ACTIVE", limit: 10 });
		expect(requestMock).toHaveBeenCalledWith("GET", "/vault/identities", undefined, {
			status: "ACTIVE",
			limit: "10",
		});

		await resource.audit({ credentialId: "cred_1", action: "broker_use" });
		expect(requestMock).toHaveBeenCalledWith("GET", "/vault/audit", undefined, {
			credentialId: "cred_1",
			action: "broker_use",
		});
	});

	test("vault createCredential carries api_key broker config (allowedHosts + revealPolicy)", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.createCredential({
			type: "api_key",
			name: "Stripe key",
			apiKey: {
				provider: "stripe",
				key: "sk_live_x",
				allowedHosts: ["api.stripe.com"],
				authHeader: "Authorization",
				authScheme: "Bearer ",
			},
			revealPolicy: "brokered",
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/credentials",
			{
				type: "api_key",
				name: "Stripe key",
				apiKey: {
					provider: "stripe",
					key: "sk_live_x",
					allowedHosts: ["api.stripe.com"],
					authHeader: "Authorization",
					authScheme: "Bearer ",
				},
				revealPolicy: "brokered",
			},
			undefined,
			undefined,
		);
	});

	test("vault credentialRequestCreate posts the request and never a secret", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.credentialRequestCreate({
			type: "api_key",
			name: "Prod Stripe key",
			reason: "Deploy needs to verify billing",
			ttlSeconds: 600,
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/credential-requests",
			{
				type: "api_key",
				name: "Prod Stripe key",
				reason: "Deploy needs to verify billing",
				ttlSeconds: 600,
			},
			undefined,
			undefined,
		);
	});

	test("vault credentialRequestStatus polls by requestId", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.credentialRequestStatus("req_1");

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/credential-requests/req_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("vault credentialRequestCancel posts to /cancel", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.credentialRequestCancel("req_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/credential-requests/req_1/cancel",
			undefined,
			undefined,
			undefined,
		);
	});

	test("vault exchangeTokenForInjection posts to the injector exchange endpoint", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);
		// Returns plaintext; the API gates it to injector credentials (master /
		// vault:inject), so a plain agent key gets 403 server-side.
		await resource.exchangeTokenForInjection("vtk_abc");
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/token/exchange",
			{ token: "vtk_abc" },
			undefined,
			undefined,
		);
	});

	test("vault getCredential does not send a reveal/unmask flag (no plaintext via SDK)", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VaultResource(client);

		await resource.getCredential("cred_1", "agent_1");

		// The SDK exposes no reveal option — it can only read masked credentials.
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/credentials/cred_1",
			undefined,
			{ agentId: "agent_1" },
			undefined,
		);
	});

	test("agents resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new AgentsResource(client);

		await resource.create({ orgId: "org_1", name: "A", slug: "a1" });
		await resource.get("agent_1");
		await resource.list({
			orgId: "org_1",
			status: "ACTIVE",
			query: "agent",
			limit: 5,
		});
		await resource.update("agent_1", { name: "B" });
		await resource.rotateKey("agent_1");
		await resource.delete("agent_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/agents",
			{ orgId: "org_1", name: "A", slug: "a1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/agents/agent_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/agents", undefined, {
			orgId: "org_1",
			status: "ACTIVE",
			query: "agent",
			limit: "5",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"PATCH",
			"/agents/agent_1",
			{ id: "agent_1", name: "B" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/agents/agent_1/rotate-key",
			{ id: "agent_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/agents/agent_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("messages resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new MessagesResource(client);

		await resource.sendEmail({
			agentId: "agent_1",
			to: ["a@x.com"],
			subject: "S",
			body: "B",
		});
		await resource.sendSms({ agentId: "agent_1", to: "+15550001", body: "Hi" });
		await resource.get("msg_1");
		await resource.list({ dateRange: { from: "2024-01-01T00:00:00.000Z" } });
		await resource.search("hello", { filters: { status: "SENT" } });
		await resource.uploadAttachment("msg_1", {
			filename: "a.txt",
			mimeType: "text/plain",
			sizeBytes: 1,
		});
		await resource.getAttachmentUrl("att_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/email",
			{
				agentId: "agent_1",
				to: ["a@x.com"],
				subject: "S",
				body: "B",
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/phone/send-sms",
			{
				agentId: "agent_1",
				to: "+15550001",
				body: "Hi",
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/messages/msg_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/messages", undefined, {
			"dateRange.from": "2024-01-01T00:00:00.000Z",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/search",
			{
				query: "hello",
				filters: { status: "SENT" },
				pagination: undefined,
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/msg_1/attachments",
			{
				messageId: "msg_1",
				filename: "a.txt",
				mimeType: "text/plain",
				sizeBytes: 1,
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/attachments/att_1/download",
			undefined,
			undefined,
			undefined,
		);
	});

	test("messages semanticSearch posts the query to /messages/search/semantic", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new MessagesResource(client);

		await resource.semanticSearch("the invoice from last week", {
			agentId: "agent_1",
			limit: 5,
			threshold: 0.6,
		});
		// Bare call: server applies defaults (limit 10, threshold 0.7) — the
		// SDK must not bake its own copies of those defaults into the wire.
		await resource.semanticSearch("hello");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/search/semantic",
			{
				query: "the invoice from last week",
				agentId: "agent_1",
				limit: 5,
				threshold: 0.6,
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/search/semantic",
			{
				query: "hello",
				agentId: undefined,
				limit: undefined,
				threshold: undefined,
			},
			undefined,
			undefined,
		);
	});

	test("drafts resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new DraftsResource(client);

		await resource.create({
			agentId: "agent_1",
			to: ["a@x.com"],
			subject: "WIP",
			body: "Draft body",
		});
		await resource.get("draft_1");
		await resource.list({ agentId: "agent_1", limit: 10, cursor: "c1" });
		await resource.send("draft_1");
		await resource.delete("draft_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/email/drafts",
			{
				agentId: "agent_1",
				to: ["a@x.com"],
				subject: "WIP",
				body: "Draft body",
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/email/drafts/draft_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/email/drafts", undefined, {
			agentId: "agent_1",
			limit: "10",
			cursor: "c1",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/email/drafts/draft_1/send",
			{ id: "draft_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/email/drafts/draft_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("drafts delete resolves to the deleted draft (contract returns it, not void)", async () => {
		const requestMock = mock(async () => ({ id: "draft_1", subject: "WIP" }));
		const client: RequestClient = { request: requestMock as RequestClient["request"] };
		const resource = new DraftsResource(client);

		const deleted = await resource.delete("draft_1");

		expect(deleted).toEqual({ id: "draft_1", subject: "WIP" } as never);
	});

	test("inboxes resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new InboxesResource(client);

		await resource.create({ username: "support", displayName: "Support", agentId: "agent_1" });
		await resource.get("inbox_1");
		await resource.list({ query: "support", limit: 10, cursor: "c1" });
		await resource.update("inbox_1", { displayName: "Sales", agentId: null });
		await resource.delete("inbox_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/inboxes",
			{ username: "support", displayName: "Support", agentId: "agent_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/inboxes/inbox_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/inboxes", undefined, {
			query: "support",
			limit: "10",
			cursor: "c1",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"PATCH",
			"/inboxes/inbox_1",
			{ id: "inbox_1", displayName: "Sales", agentId: null },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/inboxes/inbox_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("inboxes create() with no arguments sends an empty body (auto-provision)", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new InboxesResource(client);

		await resource.create();

		expect(requestMock).toHaveBeenCalledWith("POST", "/inboxes", {}, undefined, undefined);
	});

	test("sendEmail passes attachments and threading fields through to the wire", async () => {
		// Founder checklist #7: attachments (and inReplyTo/references) must not
		// be dropped between the caller and the HTTP body. This fails if the
		// SDK ever narrows or strips the send payload.
		const { client, requestMock } = createMockClient();
		const resource = new MessagesResource(client);

		const input = {
			agentId: "agent_1",
			to: ["a@x.com"],
			subject: "Report attached",
			body: "See attachment",
			attachments: [
				{ filename: "report.pdf", contentType: "application/pdf", content: "JVBERi0=" },
				{ url: "https://files.example.com/big.pdf", filename: "big.pdf" },
			],
			inReplyTo: "<msg-1@agents.useanima.sh>",
			references: ["<msg-0@agents.useanima.sh>", "<msg-1@agents.useanima.sh>"],
		};
		await resource.sendEmail(input);

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/email",
			input,
			undefined,
			undefined,
		);
	});

	test("emails resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new EmailsResource(client);

		await resource.list({ agentId: "agent_1", limit: 5 });
		await resource.uploadAttachment("msg_1", {
			filename: "b.txt",
			mimeType: "text/plain",
			sizeBytes: 2,
		});
		await resource.getAttachmentUrl("att_1");

		expect(requestMock).toHaveBeenCalledWith("GET", "/email", undefined, {
			agentId: "agent_1",
			limit: "5",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/messages/msg_1/attachments",
			{
				messageId: "msg_1",
				filename: "b.txt",
				mimeType: "text/plain",
				sizeBytes: 2,
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/attachments/att_1/download",
			undefined,
			undefined,
			undefined,
		);
	});

	test("domains resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new DomainsResource(client);

		await resource.add({ domain: "example.com" });
		await resource.get("dom_1");
		await resource.list();
		await resource.verify("dom_1");
		await resource.dnsRecords("dom_1");
		await resource.deliverability("dom_1");
		await resource.delete("dom_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/domains",
			{ domain: "example.com" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/domains/dom_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/domains",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/domains/dom_1/verify",
			{ id: "dom_1", domainId: "dom_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/domains/dom_1/dns-records",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/domains/dom_1/deliverability",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/domains/dom_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("phones resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new PhonesResource(client);

		await resource.provision({ agentId: "agent_1" });
		await resource.list({ agentId: "agent_1" });
		await resource.release({ agentId: "agent_1", phoneNumber: "+15550001" });

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/phone/provision",
			{ agentId: "agent_1" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/phone/numbers",
			undefined,
			{ agentId: "agent_1" },
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/phone/release",
			{ agentId: "agent_1", phoneNumber: "+15550001" },
			undefined,
			undefined,
		);
	});

	test("webhooks resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.create({
			url: "https://x.dev/hook",
			events: ["message.sent"],
		});
		await resource.get("wh_1");
		await resource.list({ limit: 2 });
		await resource.update("wh_1", { active: false });
		await resource.test("wh_1", "message.failed");
		await resource.listDeliveries("wh_1", { cursor: "c1", limit: 5 });
		await resource.delete("wh_1");

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks",
			{
				url: "https://x.dev/hook",
				events: ["message.sent"],
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/webhooks/wh_1",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith("GET", "/webhooks", undefined, {
			limit: "2",
		});
		expect(requestMock).toHaveBeenCalledWith(
			"PUT",
			"/webhooks/wh_1",
			{ id: "wh_1", active: false },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks/wh_1/test",
			{ id: "wh_1", event: "message.failed" },
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/webhooks/wh_1/deliveries",
			undefined,
			{
				webhookId: "wh_1",
				cursor: "c1",
				limit: "5",
			},
		);
		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/webhooks/wh_1",
			undefined,
			undefined,
			undefined,
		);
	});

	test("webhooks resource forwards advanced settings (auth + throttle) on create", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.create({
			url: "https://x.dev/hook",
			events: ["message.sent"],
			authConfig: { type: "bearer", token: "tok_secret" },
			rateLimitPerMinute: 60,
			maxAttempts: 5,
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks",
			{
				url: "https://x.dev/hook",
				events: ["message.sent"],
				authConfig: { type: "bearer", token: "tok_secret" },
				rateLimitPerMinute: 60,
				maxAttempts: 5,
			},
			undefined,
			undefined,
		);
	});

	test("webhooks resource supports every authConfig variant", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.create({
			url: "https://x.dev/a",
			events: ["message.sent"],
			authConfig: { type: "none" },
		});
		await resource.create({
			url: "https://x.dev/b",
			events: ["message.sent"],
			authConfig: { type: "basic", username: "u", password: "p" },
		});
		await resource.create({
			url: "https://x.dev/c",
			events: ["message.sent"],
			authConfig: {
				type: "custom_header",
				headerName: "X-Api-Key",
				value: "v",
			},
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks",
			{
				url: "https://x.dev/a",
				events: ["message.sent"],
				authConfig: { type: "none" },
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks",
			{
				url: "https://x.dev/b",
				events: ["message.sent"],
				authConfig: { type: "basic", username: "u", password: "p" },
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/webhooks",
			{
				url: "https://x.dev/c",
				events: ["message.sent"],
				authConfig: {
					type: "custom_header",
					headerName: "X-Api-Key",
					value: "v",
				},
			},
			undefined,
			undefined,
		);
	});

	test("webhooks resource forwards nullable throttle resets on update", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.update("wh_1", {
			authConfig: { type: "none" },
			rateLimitPerMinute: null,
			maxAttempts: null,
		});

		expect(requestMock).toHaveBeenCalledWith(
			"PUT",
			"/webhooks/wh_1",
			{
				id: "wh_1",
				authConfig: { type: "none" },
				rateLimitPerMinute: null,
				maxAttempts: null,
			},
			undefined,
			undefined,
		);
	});

	test("security resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new SecurityResource(client);

		await resource.scanContent({
			orgId: "org_1",
			channel: "EMAIL",
			body: "hello",
		});
		await resource.listEvents({ orgId: "org_1", type: "BLOCKED", limit: 10 });

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/security/scan",
			{
				orgId: "org_1",
				channel: "EMAIL",
				body: "hello",
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/orgs/org_1/security/events",
			undefined,
			{ orgId: "org_1", type: "BLOCKED", limit: "10" },
			undefined,
		);
	});

	test("identity resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new IdentityResource(client);

		await resource.getDid("agent_1");
		await resource.resolveDid("did:web:agents.useanima.sh:org:agent");
		await resource.listCredentials("agent_1");
		await resource.issueCredential("agent_1", {
			type: "AnimaTrustScore",
			claims: { score: 80 },
			expiresInSeconds: 3600,
		});
		await resource.revokeCredential("agent_1", "vc_1");

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/agents/agent_1/did",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			// DIDs contain ":" — the path segment must be URI-encoded.
			"/identity/did/did%3Aweb%3Aagents.useanima.sh%3Aorg%3Aagent",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/agents/agent_1/credentials",
			undefined,
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/agents/agent_1/credentials",
			{
				agentId: "agent_1",
				type: "AnimaTrustScore",
				claims: { score: 80 },
				expiresInSeconds: 3600,
			},
			undefined,
			undefined,
		);
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/agents/agent_1/credentials/vc_1/revoke",
			undefined,
			undefined,
			undefined,
		);
	});

	test("voices resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VoicesResource(client);

		await resource.list();
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/catalog",
			undefined,
			undefined,
			undefined,
		);

		// Multilingual catalog: filtering by language is the primary axis.
		await resource.list({ language: "es" });
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/catalog",
			undefined,
			{
				language: "es",
			},
			undefined,
		);

		await resource.list({ gender: "female", language: "en" });
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/catalog",
			undefined,
			{
				gender: "female",
				language: "en",
			},
			undefined,
		);
	});

	test("calls resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new CallsResource(client);

		await resource.list();
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/calls",
			undefined,
			undefined,
			undefined,
		);

		await resource.list({ agentId: "agent_1", limit: 10 });
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/calls",
			undefined,
			{
				agentId: "agent_1",
				limit: "10",
			},
			undefined,
		);

		await resource.get("call_1");
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/calls/call_1",
			undefined,
			undefined,
			undefined,
		);

		await resource.create({ to: "+15551234567", tier: "basic" });
		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/voice/calls",
			{
				to: "+15551234567",
				tier: "basic",
			},
			undefined,
			undefined,
		);

		await resource.getTranscript("call_1");
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/voice/calls/call_1/transcript",
			undefined,
			undefined,
			undefined,
		);
	});

	test("extension resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new ExtensionResource(client);

		// Master-key call: agentId + ttl both provided.
		await resource.connect({ agentId: "agent_1", ttl: "15m" });
		expect(requestMock).toHaveBeenCalledWith("POST", "/extension/connect", { agentId: "agent_1", ttl: "15m" }, undefined, undefined);

		// Agent-key call: no input — the body must be empty, not { agentId: undefined }.
		await resource.connect();
		expect(requestMock).toHaveBeenCalledWith("POST", "/extension/connect", {}, undefined, undefined);

		// Only ttl provided — agentId key must be absent from the body.
		await resource.connect({ ttl: "session" });
		expect(requestMock).toHaveBeenCalledWith("POST", "/extension/connect", { ttl: "session" }, undefined, undefined);
	});

	test("extension resource surfaces the connectUrl from the response", async () => {
		const response = {
			agentId: "agent_1",
			connectUrl: "https://connect.useanima.sh/ext/abc123",
			expiresAt: "2026-07-07T12:15:00.000Z",
			exchangeExpiresAt: "2026-07-07T11:05:00.000Z",
			policy: "session" as const,
		};
		const requestMock = mock(async () => response);
		const client: RequestClient = { request: requestMock as RequestClient["request"] };
		const resource = new ExtensionResource(client);

		const result = await resource.connect({ agentId: "agent_1" });

		expect(result.connectUrl).toBe("https://connect.useanima.sh/ext/abc123");
		expect(result.agentId).toBe("agent_1");
		expect(result.policy).toBe("session");
	});

	test("a2a resource dispatch uses expected method/path", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new A2AResource(client);

		await resource.dispatch("ag_1", { toDid: "did:web:example.com", type: "ping", input: {} });

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/agents/ag_1/a2a/dispatch",
			{ fromAgentId: "ag_1", toDid: "did:web:example.com", type: "ping", input: {} },
			undefined,
			undefined,
		);
	});
});

// ---------------------------------------------------------------------------
// Spec B3 — messages.updateLabels()
// ---------------------------------------------------------------------------
describe("messages.updateLabels (B3)", () => {
	test("PATCHes the labels route with both operations", async () => {
		const { client, requestMock } = createMockClient();
		const messages = new MessagesResource(client);
		await messages.updateLabels("msg_1", { addLabels: ["read"], removeLabels: ["unread"] });

		expect(requestMock).toHaveBeenCalledWith(
			"PATCH",
			"/messages/msg_1/labels",
			// `id` is in the path AND the body: the contract's input schema carries
			// it, so omitting it would 400 on a required field.
			{ id: "msg_1", addLabels: ["read"], removeLabels: ["unread"] },
			undefined,
			undefined,
		);
	});

	test("a call with neither operation throws before the request", () => {
		const { client, requestMock } = createMockClient();
		const messages = new MessagesResource(client);

		// Failing fast beats a 400 round-trip: the API's error would not say which
		// of the two operations the caller forgot.
		expect(() => messages.updateLabels("msg_1", {})).toThrow(
			/at least one of addLabels or removeLabels/,
		);
		expect(requestMock).not.toHaveBeenCalled();
	});

	test("empty arrays count as absent, not as an operation", () => {
		const { client } = createMockClient();
		const messages = new MessagesResource(client);

		// `{ addLabels: [] }` reads like "add nothing" — it must be refused for the
		// same reason `{}` is, not sent as a request that changes nothing.
		expect(() => messages.updateLabels("msg_1", { addLabels: [], removeLabels: [] })).toThrow(
			/at least one of addLabels or removeLabels/,
		);
	});
});
