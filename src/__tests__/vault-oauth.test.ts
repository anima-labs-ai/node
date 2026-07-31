/**
 * Tests for VaultOAuthResource.
 *
 * This surface did not exist in the node SDK at all — six routes the API has
 * served all along (browse apps, mint a Connect Link, poll it, list and revoke
 * connected accounts) were reachable from python and go but not from here.
 *
 * Note the envelope asymmetry pinned below: the list routes return an `items`
 * envelope, which this resource unwraps, while GET /agents/{id}/credentials
 * returns a bare array. Both live in this SDK.
 *
 * Source of truth, at the commit pinned in .anima-ref:
 *   packages/contracts/src/schemas/vault.ts
 *   packages/contracts/src/contracts/vault.ts
 */
import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { VaultOAuthResource } from "../resources/vault-oauth";
import type { ConnectedAccount, OAuthAppDefinition } from "../types";

const APP: OAuthAppDefinition = {
	id: "app_001",
	slug: "github",
	name: "GitHub",
	description: "Code hosting",
	iconUrl: "https://cdn.useanima.sh/github.svg",
	authMethod: "OAUTH2_PKCE",
	defaultScopes: ["repo", "read:user"],
	requiresPkce: true,
	category: "developer",
	isManaged: true,
	isActive: true,
};

const ACCOUNT: ConnectedAccount = {
	id: "acct_001",
	agentId: "agent_001",
	userId: null,
	appDefinitionId: "app_001",
	appSlug: "github",
	appName: "GitHub",
	appIconUrl: null,
	customAppId: null,
	grantedScopes: ["repo"],
	accountLabel: "work",
	accountEmail: "dev@example.com",
	status: "ACTIVE",
	statusMessage: null,
	tokenExpiresAt: "2026-08-01T00:00:00Z",
	lastRefreshedAt: null,
	createdAt: "2026-07-31T00:00:00Z",
	updatedAt: "2026-07-31T00:00:00Z",
};

function mockClient(response: unknown): {
	client: RequestClient;
	requestMock: ReturnType<typeof mock>;
} {
	const requestMock = mock(async () => response);
	return { client: { request: requestMock as RequestClient["request"] }, requestMock };
}

describe("vaultOAuth.listApps", () => {
	test("unwraps the items envelope", async () => {
		const { client, requestMock } = mockClient({ items: [APP] });
		const apps = await new VaultOAuthResource(client).listApps();

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/apps",
			undefined,
			undefined,
			undefined,
		);
		expect(apps).toEqual([APP]);
	});

	test("filters by category", async () => {
		const { client, requestMock } = mockClient({ items: [] });
		await new VaultOAuthResource(client).listApps({ category: "developer" });

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/apps",
			undefined,
			{ category: "developer" },
			undefined,
		);
	});
});

describe("vaultOAuth.getApp", () => {
	test("gets a single app by slug", async () => {
		const { client, requestMock } = mockClient(APP);
		const app = await new VaultOAuthResource(client).getApp("github");

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/apps/github",
			undefined,
			undefined,
			undefined,
		);
		expect(app.defaultScopes).toEqual(["repo", "read:user"]);
	});
});

describe("vaultOAuth.createLink", () => {
	test("posts the input through unchanged", async () => {
		const link = {
			linkUrl: "https://connect.useanima.sh/l/tok_1",
			token: "tok_1",
			expiresAt: "2026-07-31T00:10:00Z",
		};
		const { client, requestMock } = mockClient(link);
		const result = await new VaultOAuthResource(client).createLink({
			appSlug: "github",
			agentId: "agent_001",
			scopes: ["repo"],
		});

		expect(requestMock).toHaveBeenCalledWith(
			"POST",
			"/vault/oauth/link",
			{ appSlug: "github", agentId: "agent_001", scopes: ["repo"] },
			undefined,
			undefined,
		);
		expect(result).toEqual(link);
	});
});

describe("vaultOAuth.getLinkStatus", () => {
	test("polls by token", async () => {
		const { client, requestMock } = mockClient({
			status: "COMPLETED",
			connectedAccountId: "acct_001",
		});
		const status = await new VaultOAuthResource(client).getLinkStatus("tok_1");

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/link/tok_1",
			undefined,
			undefined,
			undefined,
		);
		expect(status.connectedAccountId).toBe("acct_001");
	});
});

describe("vaultOAuth.listAccounts", () => {
	test("unwraps the items envelope", async () => {
		const { client, requestMock } = mockClient({ items: [ACCOUNT] });
		const accounts = await new VaultOAuthResource(client).listAccounts();

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/accounts",
			undefined,
			{},
			undefined,
		);
		expect(accounts).toEqual([ACCOUNT]);
	});

	test("builds the filter query", async () => {
		const { client, requestMock } = mockClient({ items: [] });
		await new VaultOAuthResource(client).listAccounts({
			agentId: "agent_001",
			appSlug: "github",
			status: "EXPIRED",
		});

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/vault/oauth/accounts",
			undefined,
			{ agentId: "agent_001", appSlug: "github", status: "EXPIRED" },
			undefined,
		);
	});
});

describe("vaultOAuth.disconnect", () => {
	test("deletes the account and resolves to void", async () => {
		const { client, requestMock } = mockClient({ success: true });
		const result = await new VaultOAuthResource(client).disconnect("acct_001");

		expect(requestMock).toHaveBeenCalledWith(
			"DELETE",
			"/vault/oauth/accounts/acct_001",
			undefined,
			undefined,
			undefined,
		);
		expect(result).toBeUndefined();
	});
});
