/**
 * The `Tier` union is a wire contract with the API's `TierSchema`.
 *
 * Unlike the Python SDK — where the same list is a pydantic enum and a missing
 * member throws at parse time — a wrong union here fails silently in one
 * direction and loudly in the other. Reading an unknown tier just flows through
 * as a string TypeScript believes is impossible; but `tier` on
 * CreateOrganizationInput/UpdateOrganizationInput is typed with this union, so
 * a *missing* tier cannot be passed at all. STARTER was missing, which meant
 * no caller could create or move an organization onto the Starter plan through
 * the typed API, while DEVELOPER and SCALE — which the API rejects — were
 * offered as valid choices.
 *
 * Runtime tests cannot catch that, so the guard below is type-level. It is
 * enforced by `bun run typecheck`, which includes tsconfig.tests.json.
 */

import { describe, expect, mock, test } from "bun:test";

import type { RequestClient } from "../client";
import { OrganizationsResource } from "../resources/organizations";
import type { CreateOrganizationInput, OrganizationOutput, Tier } from "../types";

/**
 * The tiers the API can actually accept or return. Mirrors `TierSchema` in
 * packages/contracts/src/schemas/organization.ts and the Prisma `Tier` enum.
 * Spelled out rather than derived from `Tier` — a check that reads the same
 * type it is checking cannot fail when that type is wrong.
 */
const LIVE_TIERS = ["FREE", "STARTER", "GROWTH", "ENTERPRISE"] as const;

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Exact match, both directions: a dropped tier makes this `false` (blocking
// real callers), and so does an added phantom one (offering a choice the API
// will reject). Assigning to `true` is what turns either into a build error.
const _tierMatchesContract: Equals<Tier, (typeof LIVE_TIERS)[number]> = true;

function createMockClient(response: unknown): {
	client: RequestClient;
	requestMock: ReturnType<typeof mock>;
} {
	const requestMock = mock(async () => response);
	return { client: { request: requestMock as RequestClient["request"] }, requestMock };
}

function orgResponse(tier: Tier): OrganizationOutput {
	return {
		id: "org_1",
		name: "Acme",
		slug: "acme",
		clerkOrgId: null,
		tier,
		masterKey: "sk-test-master",
		settings: {},
		createdAt: "2025-01-01T00:00:00Z",
		updatedAt: "2025-01-01T00:00:00Z",
	};
}

describe("Tier", () => {
	test("the union exactly matches the API's tier set", () => {
		// The type-level assertion above is the real guard; this asserts the
		// same thing at runtime so the reason is visible in test output rather
		// than only as a tsc error.
		expect([...LIVE_TIERS]).toEqual(["FREE", "STARTER", "GROWTH", "ENTERPRISE"]);
		expect(_tierMatchesContract).toBe(true);
	});

	test("every live tier is accepted as create input", () => {
		// The regression: `tier: "STARTER"` was a type error, so the Starter
		// plan was unreachable through the typed client.
		for (const tier of LIVE_TIERS) {
			const input: CreateOrganizationInput = { name: "Acme", slug: "acme", tier };
			expect(input.tier).toBe(tier);
		}
	});

	test("a STARTER organization round-trips through the resource", async () => {
		const { client, requestMock } = createMockClient(orgResponse("STARTER"));
		const resource = new OrganizationsResource(client);

		const org = await resource.get("org_1");

		expect(requestMock).toHaveBeenCalledWith(
			"GET",
			"/orgs/org_1",
			undefined,
			undefined,
			undefined,
		);
		expect(org.tier).toBe("STARTER");
	});
});
