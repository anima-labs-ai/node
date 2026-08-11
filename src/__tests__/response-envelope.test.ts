/**
 * This SDK passes single-key response envelopes through; the Python SDK
 * unwraps them. `listCredentials()` resolves to `{ items }` here and to a
 * plain `list` there; `generatePassword()` to `{ password }` here and to a
 * bare `str` there. Both SDKs are internally consistent and inconsistent with
 * each other, which is documented in the README's "Response shapes" section.
 *
 * That difference has already cost something. The toolkit packages were
 * written by translating call sites between the two languages and read
 * `.value` off `generatePassword()` in both — wrong in each, for opposite
 * reasons (anima-labs-ai/toolkit#5).
 *
 * A README cannot fail. These guards can: if a method quietly starts
 * unwrapping, the convention breaks here rather than in a caller, and whoever
 * changed it has to update the documentation deliberately.
 *
 * Type-level, in the style of phone-shape.test.ts, and enforced by
 * `bun run typecheck` via tsconfig.tests.json.
 */

import { describe, expect, test } from "bun:test";

import type { Anima } from "../index";

type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Resolved<T> = T extends PromiseLike<infer R> ? R : never;

// The envelope each method resolves to. Spelled out rather than derived from
// the method's own return type — a check that reads the same type it is
// checking cannot fail when that type is wrong.
type GeneratedPasswordEnvelope = { password: string };

const _listCredentialsKeepsItsEnvelope: Equals<
	keyof Resolved<ReturnType<Anima["vault"]["listCredentials"]>>,
	"items"
> = true;

const _generatePasswordKeepsItsEnvelope: Equals<
	Resolved<ReturnType<Anima["vault"]["generatePassword"]>>,
	GeneratedPasswordEnvelope
> = true;

// Paginated resources are the documented exception: the cursor travels with
// the page, so `await` yields `{ items, pagination }` rather than a bare list.
const _pagesCarryTheirCursor: Equals<
	keyof Resolved<ReturnType<Anima["messages"]["list"]>>,
	"items" | "pagination"
> = true;

describe("response envelopes are passed through, not unwrapped", () => {
	test("the type-level guards are asserted", () => {
		// The real assertions are the `= true` bindings above, checked by tsc.
		// This keeps the file a runnable test and documents the count, so
		// deleting a guard is visible rather than silent.
		expect([
			_listCredentialsKeepsItsEnvelope,
			_generatePasswordKeepsItsEnvelope,
			_pagesCarryTheirCursor,
		]).toEqual([true, true, true]);
	});
});
