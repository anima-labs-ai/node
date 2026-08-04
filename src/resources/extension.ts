import type { RequestClient } from "../client";
import type {
	ConnectExtensionInput,
	ConnectExtensionResult,
	RequestOptions,
} from "../types";

export class ExtensionResource {
	public constructor(private readonly client: RequestClient) {}

	// Mint a connect URL that opens the Anima browser extension already bound
	// to an agent's session. Auth model: with a master key, pass `agentId`;
	// as the agent itself, omit it. A `ttl` longer than the org's configured
	// maximum is rejected (not silently shortened) — omit it to use the org
	// default. The response never carries a secret.
	public connect(
		input: ConnectExtensionInput = {},
		options?: RequestOptions,
	): Promise<ConnectExtensionResult> {
		// Send only the keys the caller provided — the server distinguishes
		// "omitted" (derive agentId from the key) from an explicit value.
		const body: Record<string, string> = {};
		if (input.agentId !== undefined) body.agentId = input.agentId;
		if (input.ttl !== undefined) body.ttl = input.ttl;

		return this.client.request<ConnectExtensionResult>(
			"POST",
			"/extension/connect",
			body,
			undefined,
			options,
		);
	}
}
