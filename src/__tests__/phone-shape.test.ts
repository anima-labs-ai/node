/**
 * The phone types are a wire contract with the API's phone schemas.
 *
 * `PhoneIdentityOutput.provider` and `PhoneProvisionOutput.provider` were
 * declared REQUIRED and the API returns neither: both schemas dropped the
 * field (packages/contracts/src/schemas/agent.ts and .../phone.ts), and oRPC
 * strips anything the schema does not declare. Every phone object a caller
 * received had `undefined` where the type promised a `PhoneProvider`, and the
 * compiler cheerfully allowed `phone.provider.toLowerCase()`.
 *
 * It was dropped on purpose, not by accident: naming the carrier on a product
 * surface is what the vendor-neutrality rule forbids, so `provider` is not
 * coming back and the `PhoneProvider` union goes with it — the same way
 * `VoiceTier` went when `tier` was dropped.
 *
 * The reverse direction cost something too. `voiceId` has been on
 * `PhoneIdentityOutput` since the per-number voice landed, and the SDK never
 * declared it, so callers could not reach a field the API was already
 * sending — the per-number voice was unreadable through the typed API.
 *
 * Runtime tests cannot catch a field that is merely absent from a response, so
 * these guards are type-level, in the style of call-shape.test.ts. They are
 * enforced by `bun run typecheck`, which includes tsconfig.tests.json.
 */

import { describe, expect, test } from "bun:test";

import type { PhoneIdentityOutput, PhoneProvisionOutput } from "../types";

/**
 * The fields each schema actually carries. Spelled out rather than derived from
 * the SDK types — a check that reads the same type it is checking cannot fail
 * when that type is wrong.
 */
const LIVE_PHONE_IDENTITY_FIELDS = [
	"id",
	"phoneNumber",
	"providerId",
	"capabilities",
	"tenDlcStatus",
	"isPrimary",
	"voiceId",
	"createdAt",
] as const;

const LIVE_PHONE_PROVISION_FIELDS = [
	"id",
	"phoneNumber",
	"providerId",
	"capabilities",
	"tenDlcStatus",
	"isPrimary",
	"createdAt",
] as const;

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Exact match, both directions. A field the API returns but the SDK omits is
// data a caller cannot reach; a field the SDK declares but the API never sends
// is a value that is always undefined behind a type that says otherwise.
const _phoneIdentityMatchesContract: Equals<
	keyof PhoneIdentityOutput,
	(typeof LIVE_PHONE_IDENTITY_FIELDS)[number]
> = true;

const _phoneProvisionMatchesContract: Equals<
	keyof PhoneProvisionOutput,
	(typeof LIVE_PHONE_PROVISION_FIELDS)[number]
> = true;

describe("phone shapes match the API contract", () => {
	test("the type-level guards are asserted", () => {
		// The real assertions are the two `= true` bindings above, checked by
		// tsc. This keeps the file a runnable test and documents the count, so
		// deleting a guard is visible rather than silent.
		expect([
			_phoneIdentityMatchesContract,
			_phoneProvisionMatchesContract,
		]).toEqual([true, true]);
	});
});
