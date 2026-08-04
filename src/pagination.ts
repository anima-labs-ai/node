import type { RequestClient } from "./client";
import type { PaginatedResponse } from "./types";

/**
 * A paginated list result that supports both single-page access and
 * automatic iteration across all pages.
 *
 * Single page (backwards compatible):
 *   const page = await anima.agents.list();
 *   console.log(page.items, page.pagination);
 *
 * Auto-pagination:
 *   for await (const agent of anima.agents.list()) {
 *     console.log(agent);
 *   }
 */
/**
 * The flat list envelope, as roughly a third of the API answers it.
 *
 * `{items, nextCursor}` — audit logs, anomaly alerts and rules, compliance
 * controls/reports/dsars, A2A tasks — rather than the nested
 * `{items, pagination: {nextCursor, hasMore}}`. Neither is "the standard":
 * across the contracts the split is 23 outputs to 24.
 */
interface FlatCursorPage<T> {
	items: T[];
	nextCursor?: string | null;
	totalCount?: number;
	total?: number;
}

/**
 * Accept either envelope and always hand back the nested one.
 *
 * Without this, `page.pagination` is `undefined` for every flat-envelope
 * endpoint — so `await anima.audit.list(orgId)` returned a page whose
 * `.pagination` was undefined, and auto-iterating it threw
 * "undefined is not an object (evaluating 'page.pagination.hasMore')" on the
 * first page boundary. Verified against a live API before this fix.
 *
 * `hasMore` is derived: these endpoints signal the end of a list with a null
 * `nextCursor` and never send `hasMore` at all.
 */
function normalizePage<T>(
	raw: PaginatedResponse<T> | FlatCursorPage<T>,
): PaginatedResponse<T> {
	if ("pagination" in raw && raw.pagination) return raw;
	const flat = raw as FlatCursorPage<T>;
	const nextCursor = flat.nextCursor ?? null;
	return {
		...flat,
		items: flat.items,
		pagination: { nextCursor, hasMore: nextCursor !== null },
	} as PaginatedResponse<T>;
}

export class PageIterator<T>
	implements PromiseLike<PaginatedResponse<T>>, AsyncIterable<T>
{
	private readonly fetchPage: (
		cursor?: string,
	) => Promise<PaginatedResponse<T>>;

	constructor(fetchPage: (cursor?: string) => Promise<PaginatedResponse<T>>) {
		this.fetchPage = fetchPage;
	}

	/** Await the first page (backwards compatible with Promise<PaginatedResponse<T>>) */
	then<TResult1 = PaginatedResponse<T>, TResult2 = never>(
		onfulfilled?:
			| ((value: PaginatedResponse<T>) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.fetchPage()
			.then((page) => normalizePage(page))
			.then(onfulfilled, onrejected);
	}

	/** Iterate over all items across all pages automatically */
	async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
		let cursor: string | undefined;
		do {
			const page = normalizePage(await this.fetchPage(cursor));
			for (const item of page.items) {
				yield item;
			}
			cursor =
				page.pagination.hasMore && page.pagination.nextCursor
					? page.pagination.nextCursor
					: undefined;
		} while (cursor);
	}
}

/** Helper to create a PageIterator from a client request */
export function createPageIterator<T, P extends { cursor?: string }>(
	client: RequestClient,
	method: string,
	path: string,
	params: P | undefined,
	toQuery: (params?: P) => Record<string, string> | undefined,
): PageIterator<T> {
	return new PageIterator<T>((cursor) => {
		const merged = cursor ? ({ ...params, cursor } as P) : params;
		return client.request<PaginatedResponse<T>>(
			method,
			path,
			undefined,
			toQuery(merged),
		);
	});
}
