/**
 * Tests for RegistryResource, centred on DID path encoding.
 *
 * `lookup`, `update` and `unlist` all interpolate a DID into the path. DIDs
 * contain colons, which are legal in a path segment — so raw interpolation
 * looks fine and works for the common case. It breaks on the one that matters:
 * a `did:web` carrying a port percent-encodes that colon, so the DID string
 * itself contains `%3A`. Interpolated raw, the server decodes it back to `:`
 * and looks up a DIFFERENT DID.
 *
 * There was no registry test file in any of the three SDKs, and python and go
 * were interpolating raw because of it.
 */
import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { RegistryResource } from "../resources/registry";

/** A did:web with a port — the spec percent-encodes the colon before it. */
const DID_WITH_PORT = "did:web:localhost%3A3000:agents:a1";
const PLAIN_DID = "did:web:agents.useanima.sh:org1:agent123";

function mockClient(): {
	client: RequestClient;
	requestMock: ReturnType<typeof mock>;
} {
	const requestMock = mock(async () => ({ did: PLAIN_DID }));
	return {
		client: { request: requestMock as RequestClient["request"] },
		requestMock,
	};
}

/** The path the SDK actually sent, as the server's router would see it. */
function sentPath(requestMock: ReturnType<typeof mock>): string {
	return (requestMock.mock.calls[0] as unknown[])[1] as string;
}

describe("registry DID path encoding", () => {
	test("lookup encodes the DID", () => {
		const { client, requestMock } = mockClient();
		void new RegistryResource(client).lookup(PLAIN_DID);

		expect(sentPath(requestMock)).toBe(
			"/registry/agents/did%3Aweb%3Aagents.useanima.sh%3Aorg1%3Aagent123",
		);
	});

	test("update encodes the DID", () => {
		const { client, requestMock } = mockClient();
		void new RegistryResource(client).update(PLAIN_DID, { name: "x" });

		expect(sentPath(requestMock)).toBe(
			"/registry/agents/did%3Aweb%3Aagents.useanima.sh%3Aorg1%3Aagent123",
		);
	});

	test("unlist encodes the DID", () => {
		const { client, requestMock } = mockClient();
		void new RegistryResource(client).unlist(PLAIN_DID);

		expect(sentPath(requestMock)).toBe(
			"/registry/agents/did%3Aweb%3Aagents.useanima.sh%3Aorg1%3Aagent123",
		);
	});

	/**
	 * The case raw interpolation gets wrong. `%3A` must survive as `%253A` so
	 * the server decodes it back to `%3A` and not to `:` — otherwise it
	 * resolves `did:web:localhost:3000:agents:a1`, a DID nobody registered.
	 */
	test("a percent-encoded port survives the round trip", () => {
		const { client, requestMock } = mockClient();
		void new RegistryResource(client).lookup(DID_WITH_PORT);

		const path = sentPath(requestMock);
		expect(path).toContain("%253A3000");
		expect(decodeURIComponent(path.replace("/registry/agents/", ""))).toBe(
			DID_WITH_PORT,
		);
	});

	/** A stray slash would otherwise split the path and hit a different route. */
	test("a slash in the DID cannot split the path", () => {
		const { client, requestMock } = mockClient();
		void new RegistryResource(client).lookup("did:web:a/b");

		const path = sentPath(requestMock);
		expect(path).toBe("/registry/agents/did%3Aweb%3Aa%2Fb");
		expect(path.split("/").length).toBe(4);
	});
});
