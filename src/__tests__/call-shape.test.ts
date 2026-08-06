/**
 * The call types are a wire contract with the API's voice schemas.
 *
 * `Call.tier` and `CreateCallOutput.tier` were declared REQUIRED and the API
 * returns neither: `CallSchema` and `CreateCallOutput` in
 * packages/contracts/src/schemas/voice.ts have no such field, and oRPC strips
 * anything the schema does not declare. So every call object a caller received
 * had `undefined` where the type promised a `VoiceTier`, and the compiler
 * cheerfully allowed `call.tier.toUpperCase()`.
 *
 * `CreateCallInput.tier` failed the other way: it type-checked, serialized, and
 * did nothing. Both transports pin the pipeline themselves and say so —
 * routes/handlers/voice.ts: "there is no tier input to honor", and
 * plugins/ws-voice.ts: "Any `tier` in the wire message is ignored". An option
 * that cannot change the outcome is worse than a missing one, because the
 * caller believes they chose.
 *
 * Runtime tests cannot catch a field that is merely absent from a response, so
 * these guards are type-level, in the style of tier.test.ts. They are enforced
 * by `bun run typecheck`, which includes tsconfig.tests.json.
 */

import { describe, expect, test } from "bun:test";

import type { Call, CreateCallInput, CreateCallOutput } from "../types";

/**
 * The fields each schema actually carries. Spelled out rather than derived from
 * the SDK types — a check that reads the same type it is checking cannot fail
 * when that type is wrong.
 */
const LIVE_CALL_FIELDS = [
	"id",
	"agentId",
	"phoneIdentityId",
	"direction",
	"state",
	"from",
	"to",
	"startedAt",
	"answeredAt",
	"endedAt",
	"endReason",
	"durationSeconds",
	"createdAt",
] as const;

const LIVE_CREATE_CALL_INPUT_FIELDS = ["to", "agentId", "greeting", "fromNumber"] as const;

const LIVE_CREATE_CALL_OUTPUT_FIELDS = ["callId", "state", "from", "to", "direction"] as const;

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

// Exact match, both directions. A field the API returns but the SDK omits is
// data a caller cannot reach; a field the SDK declares but the API never sends
// is a value that is always undefined behind a type that says otherwise.
const _callMatchesContract: Equals<keyof Call, (typeof LIVE_CALL_FIELDS)[number]> = true;

const _createInputMatchesContract: Equals<
	keyof CreateCallInput,
	(typeof LIVE_CREATE_CALL_INPUT_FIELDS)[number]
> = true;

const _createOutputMatchesContract: Equals<
	keyof CreateCallOutput,
	(typeof LIVE_CREATE_CALL_OUTPUT_FIELDS)[number]
> = true;

describe("call shapes match the API contract", () => {
	test("the type-level guards are asserted", () => {
		// The real assertions are the three `= true` bindings above, checked by
		// tsc. This keeps the file a runnable test and documents the count, so
		// deleting a guard is visible rather than silent.
		expect([
			_callMatchesContract,
			_createInputMatchesContract,
			_createOutputMatchesContract,
		]).toEqual([true, true, true]);
	});
});
