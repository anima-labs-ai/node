import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { AgentsResource } from "../resources/agents";
import { DomainsResource } from "../resources/domains";
import { EmailsResource } from "../resources/emails";
import { MessagesResource } from "../resources/messages";
import { OrganizationsResource } from "../resources/organizations";
import { PhonesResource } from "../resources/phones";
import { SecurityResource } from "../resources/security";
import { WebhooksResource } from "../resources/webhooks";
import { VoicesResource } from "../resources/voices";
import { CallsResource } from "../resources/calls";

function createMockClient(): { client: RequestClient; requestMock: ReturnType<typeof mock> } {
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

		expect(requestMock).toHaveBeenCalledWith("POST", "/orgs", { name: "Acme", slug: "acme" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/orgs/org_1", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/orgs", undefined, { limit: "10", cursor: "c1" });
		expect(requestMock).toHaveBeenCalledWith("PATCH", "/orgs/org_1", { id: "org_1", name: "Acme 2" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/orgs/org_1/rotate-key", { id: "org_1" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("DELETE", "/orgs/org_1", undefined, undefined, undefined);
	});

	test("agents resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new AgentsResource(client);

		await resource.create({ orgId: "org_1", name: "A", slug: "a1" });
		await resource.get("agent_1");
		await resource.list({ orgId: "org_1", status: "ACTIVE", query: "agent", limit: 5 });
		await resource.update("agent_1", { name: "B" });
		await resource.rotateKey("agent_1");
		await resource.delete("agent_1");

		expect(requestMock).toHaveBeenCalledWith("POST", "/agents", { orgId: "org_1", name: "A", slug: "a1" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/agents/agent_1", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/agents", undefined, {
			orgId: "org_1",
			status: "ACTIVE",
			query: "agent",
			limit: "5",
		});
		expect(requestMock).toHaveBeenCalledWith("PATCH", "/agents/agent_1", { id: "agent_1", name: "B" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/agents/agent_1/rotate-key", { id: "agent_1" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("DELETE", "/agents/agent_1", undefined, undefined, undefined);
	});

	test("messages resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new MessagesResource(client);

		await resource.sendEmail({ agentId: "agent_1", to: ["a@x.com"], subject: "S", body: "B" });
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

		expect(requestMock).toHaveBeenCalledWith("POST", "/messages/email", {
			agentId: "agent_1",
			to: ["a@x.com"],
			subject: "S",
			body: "B",
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/phone/send-sms", {
			agentId: "agent_1",
			to: "+15550001",
			body: "Hi",
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/messages/msg_1", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/messages", undefined, {
			"dateRange.from": "2024-01-01T00:00:00.000Z",
		});
		expect(requestMock).toHaveBeenCalledWith("POST", "/messages/search", {
			query: "hello",
			filters: { status: "SENT" },
			pagination: undefined,
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/messages/msg_1/attachments", {
			messageId: "msg_1",
			filename: "a.txt",
			mimeType: "text/plain",
			sizeBytes: 1,
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/attachments/att_1/download", undefined, undefined, undefined);
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
		expect(requestMock).toHaveBeenCalledWith("POST", "/messages/msg_1/attachments", {
			messageId: "msg_1",
			filename: "b.txt",
			mimeType: "text/plain",
			sizeBytes: 2,
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/attachments/att_1/download", undefined, undefined, undefined);
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

		expect(requestMock).toHaveBeenCalledWith("POST", "/domains", { domain: "example.com" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/domains/dom_1", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/domains", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/domains/dom_1/verify", { id: "dom_1", domainId: "dom_1" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/domains/dom_1/dns-records", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/domains/dom_1/deliverability", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("DELETE", "/domains/dom_1", undefined, undefined, undefined);
	});

	test("phones resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new PhonesResource(client);

		await resource.provision({ agentId: "agent_1" });
		await resource.list({ agentId: "agent_1" });
		await resource.release({ agentId: "agent_1", phoneNumber: "+15550001" });

		expect(requestMock).toHaveBeenCalledWith("POST", "/phone/provision", { agentId: "agent_1" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/phone/numbers", undefined, { agentId: "agent_1" }, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/phone/release", { agentId: "agent_1", phoneNumber: "+15550001" }, undefined, undefined);
	});

	test("webhooks resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.create({ url: "https://x.dev/hook", events: ["message.sent"] });
		await resource.get("wh_1");
		await resource.list({ limit: 2 });
		await resource.update("wh_1", { active: false });
		await resource.test("wh_1", "message.failed");
		await resource.listDeliveries("wh_1", { cursor: "c1", limit: 5 });
		await resource.delete("wh_1");

		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks", {
			url: "https://x.dev/hook",
			events: ["message.sent"],
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/webhooks/wh_1", undefined, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/webhooks", undefined, { limit: "2" });
		expect(requestMock).toHaveBeenCalledWith("PUT", "/webhooks/wh_1", { id: "wh_1", active: false }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks/wh_1/test", { id: "wh_1", event: "message.failed" }, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("GET", "/webhooks/wh_1/deliveries", undefined, {
			webhookId: "wh_1",
			cursor: "c1",
			limit: "5",
		});
		expect(requestMock).toHaveBeenCalledWith("DELETE", "/webhooks/wh_1", undefined, undefined, undefined);
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

		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks", {
			url: "https://x.dev/hook",
			events: ["message.sent"],
			authConfig: { type: "bearer", token: "tok_secret" },
			rateLimitPerMinute: 60,
			maxAttempts: 5,
		}, undefined, undefined);
	});

	test("webhooks resource supports every authConfig variant", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.create({ url: "https://x.dev/a", events: ["message.sent"], authConfig: { type: "none" } });
		await resource.create({
			url: "https://x.dev/b",
			events: ["message.sent"],
			authConfig: { type: "basic", username: "u", password: "p" },
		});
		await resource.create({
			url: "https://x.dev/c",
			events: ["message.sent"],
			authConfig: { type: "custom_header", headerName: "X-Api-Key", value: "v" },
		});

		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks", {
			url: "https://x.dev/a",
			events: ["message.sent"],
			authConfig: { type: "none" },
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks", {
			url: "https://x.dev/b",
			events: ["message.sent"],
			authConfig: { type: "basic", username: "u", password: "p" },
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith("POST", "/webhooks", {
			url: "https://x.dev/c",
			events: ["message.sent"],
			authConfig: { type: "custom_header", headerName: "X-Api-Key", value: "v" },
		}, undefined, undefined);
	});

	test("webhooks resource forwards nullable throttle resets on update", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new WebhooksResource(client);

		await resource.update("wh_1", {
			authConfig: { type: "none" },
			rateLimitPerMinute: null,
			maxAttempts: null,
		});

		expect(requestMock).toHaveBeenCalledWith("PUT", "/webhooks/wh_1", {
			id: "wh_1",
			authConfig: { type: "none" },
			rateLimitPerMinute: null,
			maxAttempts: null,
		}, undefined, undefined);
	});

	test("security resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new SecurityResource(client);

		await resource.scanContent({ orgId: "org_1", channel: "EMAIL", body: "hello" });
		await resource.listEvents({ orgId: "org_1", type: "BLOCKED", limit: 10 });

		expect(requestMock).toHaveBeenCalledWith("POST", "/security/scan", {
			orgId: "org_1",
			channel: "EMAIL",
			body: "hello",
		}, undefined, undefined);
		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/v1/orgs/org_1/security/events",
			undefined,
			{ orgId: "org_1", type: "BLOCKED", limit: "10" },
			undefined,
		);
	});

	test("voices resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new VoicesResource(client);

		await resource.list();
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/catalog", undefined, undefined, undefined);

		await resource.list({ tier: "premium" });
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/catalog", undefined, {
			tier: "premium",
		}, undefined);

		await resource.list({ tier: "basic", gender: "female", language: "en-US" });
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/catalog", undefined, {
			tier: "basic",
			gender: "female",
			language: "en-US",
		}, undefined);
	});

	test("calls resource uses expected methods/paths", async () => {
		const { client, requestMock } = createMockClient();
		const resource = new CallsResource(client);

		await resource.list();
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/calls", undefined, undefined, undefined);

		await resource.list({ agentId: "agent_1", limit: 10 });
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/calls", undefined, {
			agentId: "agent_1",
			limit: "10",
		}, undefined);

		await resource.get("call_1");
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/calls/call_1", undefined, undefined, undefined);

		await resource.create({ to: "+15551234567", tier: "basic" });
		expect(requestMock).toHaveBeenCalledWith("POST", "/voice/calls", {
			to: "+15551234567",
			tier: "basic",
		}, undefined, undefined);

		await resource.getTranscript("call_1");
		expect(requestMock).toHaveBeenCalledWith("GET", "/voice/calls/call_1/transcript", undefined, undefined, undefined);
	});
});
