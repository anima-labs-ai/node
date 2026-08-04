import { describe, expect, test } from "bun:test";
import { PageIterator } from "../pagination";
import type { PaginatedResponse } from "../types";

function makePage<T>(
	items: T[],
	nextCursor: string | null,
): PaginatedResponse<T> {
	return {
		items,
		pagination: { nextCursor, hasMore: nextCursor !== null },
	};
}

describe("PageIterator", () => {
	test("await returns first page (backwards compatible)", async () => {
		const page = makePage([1, 2, 3], null);
		const iter = new PageIterator(() => Promise.resolve(page));

		const result = await iter;
		expect(result.items).toEqual([1, 2, 3]);
		expect(result.pagination.hasMore).toBe(false);
	});

	test("for-await iterates single page", async () => {
		const iter = new PageIterator(() =>
			Promise.resolve(makePage(["a", "b"], null)),
		);

		const items: string[] = [];
		for await (const item of iter) {
			items.push(item);
		}
		expect(items).toEqual(["a", "b"]);
	});

	test("for-await iterates across multiple pages", async () => {
		let callCount = 0;
		const iter = new PageIterator<number>((cursor) => {
			callCount++;
			if (!cursor) {
				return Promise.resolve(makePage([1, 2], "cursor_1"));
			}
			if (cursor === "cursor_1") {
				return Promise.resolve(makePage([3, 4], "cursor_2"));
			}
			return Promise.resolve(makePage([5], null));
		});

		const items: number[] = [];
		for await (const item of iter) {
			items.push(item);
		}
		expect(items).toEqual([1, 2, 3, 4, 5]);
		expect(callCount).toBe(3);
	});

	test("handles empty first page", async () => {
		const iter = new PageIterator<string>(() =>
			Promise.resolve(makePage([], null)),
		);

		const items: string[] = [];
		for await (const item of iter) {
			items.push(item);
		}
		expect(items).toEqual([]);
	});

	test("handles single item", async () => {
		const iter = new PageIterator<number>(() =>
			Promise.resolve(makePage([42], null)),
		);

		const items: number[] = [];
		for await (const item of iter) {
			items.push(item);
		}
		expect(items).toEqual([42]);
	});

	test("handles many pages with one item each", async () => {
		let page = 0;
		const iter = new PageIterator<number>((_cursor) => {
			page++;
			if (page <= 5) {
				return Promise.resolve(makePage([page], `cursor_${page}`));
			}
			return Promise.resolve(makePage([page], null));
		});

		const items: number[] = [];
		for await (const item of iter) {
			items.push(item);
		}
		expect(items).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test("then() works with chaining", async () => {
		const iter = new PageIterator<number>(() =>
			Promise.resolve(makePage([10, 20], null)),
		);

		const count = await iter.then((page) => page.items.length);
		expect(count).toBe(2);
	});

	test("then() error handling with onrejected", async () => {
		const iter = new PageIterator<number>(() =>
			Promise.reject(new Error("API error")),
		);

		const result = await iter.then(
			() => "ok",
			(err) => (err as Error).message,
		);
		expect(result).toBe("API error");
	});

	test("propagates errors during iteration", async () => {
		let calls = 0;
		const iter = new PageIterator<number>((_cursor) => {
			calls++;
			if (calls === 1) {
				return Promise.resolve(makePage([1], "next"));
			}
			return Promise.reject(new Error("page 2 failed"));
		});

		const items: number[] = [];
		try {
			for await (const item of iter) {
				items.push(item);
			}
			expect(true).toBe(false); // should not reach here
		} catch (err) {
			expect((err as Error).message).toBe("page 2 failed");
		}
		expect(items).toEqual([1]);
	});

	test("cursor is passed correctly to fetch function", async () => {
		const cursors: (string | undefined)[] = [];
		const iter = new PageIterator<number>((cursor) => {
			cursors.push(cursor);
			if (!cursor) return Promise.resolve(makePage([1], "abc"));
			return Promise.resolve(makePage([2], null));
		});

		for await (const _ of iter) {
			// consume
		}
		expect(cursors).toEqual([undefined, "abc"]);
	});
});
